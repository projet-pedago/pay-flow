import { randomUUID } from "node:crypto";
import type { Employee, Role } from "../types.js";
import { queryPostgres } from "./postgres.js";

export const UNLINKED_EMPLOYEE_MESSAGE =
  "Votre fiche PayRollFlow se crée à la première connexion Microsoft. Reconnectez-vous si elle n’apparaît pas encore.";

const DOCUMENT_PACK = [
  { key: "cni", label: "Pièce d'identité" },
  { key: "rib", label: "RIB / IBAN" },
  { key: "contrat", label: "Contrat de travail" },
  { key: "vitale", label: "Carte Vitale / CNAM" },
] as const;

export type MicrosoftProfileInput = {
  oid: string;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  role: Role;
};

type EmployeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  department_id: string | null;
  job_title: string | null;
  contract_type: string;
  hire_date: string | Date;
  base_salary: string;
  status: string;
  iban: string | null;
  city: string | null;
  country: string | null;
  civility: string | null;
  matricule: string | null;
  address: string | null;
  postal_code: string | null;
  social_security_number: string | null;
  category: string | null;
  coefficient: string | null;
  classification_index: string | null;
  qualification: string | null;
  contract_hours: string | null;
  pas_rate: string | null;
  meal_ticket_5: string | null;
  meal_ticket_1650: string | null;
  contract_end_date: string | Date | null;
  entra_object_id: string | null;
  entra_user_principal_name: string | null;
  directory_role: Role | null;
};

export function normalizeMicrosoftEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function identityNamesFromGraph(user: {
  givenName?: string | null;
  surname?: string | null;
  displayName: string;
}): { firstName: string; lastName: string } {
  const given = (user.givenName ?? "").trim();
  const surname = (user.surname ?? "").trim();

  if (given && surname) {
    return { firstName: given, lastName: surname };
  }

  const parts = user.displayName.trim().split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return {
      firstName: parts.slice(0, -1).join(" "),
      lastName: parts[parts.length - 1] ?? "",
    };
  }

  return {
    firstName: parts[0] ?? user.displayName.trim(),
    lastName: "",
  };
}

function dateValue(value: string | Date | null): string | undefined {
  if (!value) return undefined;

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value).slice(0, 10);
}

function mapEmployee(row: EmployeeRow): Employee {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone ?? "",
    departmentId: row.department_id ?? "dep-001",
    jobTitle: row.job_title ?? "",
    contractType: row.contract_type as Employee["contractType"],
    hireDate: dateValue(row.hire_date) ?? "",
    baseSalary: Number(row.base_salary ?? 0),
    status: row.status as Employee["status"],
    iban: row.iban ?? "",
    city: row.city ?? "",
    country: row.country ?? "",
    civility: (row.civility ?? "M") as Employee["civility"],
    matricule: row.matricule ?? "",
    address: row.address ?? "",
    postalCode: row.postal_code ?? "",
    socialSecurityNumber: row.social_security_number ?? "",
    category: row.category ?? "",
    coefficient: row.coefficient ?? "",
    classificationIndex: row.classification_index ?? "",
    qualification: row.qualification ?? "",
    contractHours: Number(row.contract_hours ?? 151.67),
    pasRate: Number(row.pas_rate ?? 0),
    mealTicket5: Number(row.meal_ticket_5 ?? 0),
    mealTicket1650: Number(row.meal_ticket_1650 ?? 0),
    contractEndDate: dateValue(row.contract_end_date),
    entraObjectId: row.entra_object_id ?? undefined,
    entraUserPrincipalName: row.entra_user_principal_name ?? undefined,
    directoryRole: row.directory_role ?? undefined,
  };
}

function identityFromInput(input: MicrosoftProfileInput) {
  const oid = input.oid.trim();
  const email = normalizeMicrosoftEmail(input.email);

  const names = identityNamesFromGraph({
    givenName: input.givenName,
    surname: input.familyName,
    displayName: input.name || email,
  });

  return {
    oid,
    email,
    firstName:
      names.firstName ||
      email.split("@")[0] ||
      "Collaborateur",
    lastName: names.lastName,
  };
}

export async function findEmployeeForMicrosoft(
  identity: { id: string; email: string },
): Promise<Employee | undefined> {
  const oid = identity.id.trim();
  const email = normalizeMicrosoftEmail(identity.email);

  const result = await queryPostgres<EmployeeRow>(
    `
    SELECT *
    FROM employees
    WHERE
      ($1 <> '' AND entra_object_id = $1)
      OR
      ($2 <> '' AND LOWER(entra_user_principal_name) = LOWER($2))
      OR
      ($2 <> '' AND LOWER(email) = LOWER($2))
    LIMIT 1
    `,
    [oid, email],
  );

  if (result.rowCount === 0) {
    return undefined;
  }

  return mapEmployee(result.rows[0]);
}

async function ensureDocumentPack(employeeId: string): Promise<void> {
  for (const doc of DOCUMENT_PACK) {
    await queryPostgres(
      `
      INSERT INTO hr_documents (
        id,
        employee_id,
        document_key,
        label,
        status,
        updated_at
      )
      SELECT $1, $2, $3, $4, 'missing', NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM hr_documents
        WHERE employee_id = $2
          AND document_key = $3
      )
      `,
      [
        `${employeeId}-${doc.key}`,
        employeeId,
        doc.key,
        doc.label,
      ],
    );
  }
}

export async function provisionMicrosoftProfile(
  input: MicrosoftProfileInput,
): Promise<Employee | undefined> {
  const identity = identityFromInput(input);

  if (!identity.oid && !identity.email) {
    return undefined;
  }

  const current = await findEmployeeForMicrosoft({
    id: identity.oid,
    email: identity.email,
  });

  if (current) {
    const result = await queryPostgres<EmployeeRow>(
      `
      UPDATE employees
      SET
        first_name = $2,
        last_name = $3,
        email = $4,
        entra_object_id = $5,
        entra_user_principal_name = $6,
        directory_role = $7
      WHERE id = $1
      RETURNING *
      `,
      [
        current.id,
        identity.firstName,
        identity.lastName,
        identity.email,
        identity.oid || current.entraObjectId || null,
        identity.email || current.entraUserPrincipalName || null,
        input.role,
      ],
    );

    await ensureDocumentPack(current.id);

    return mapEmployee(result.rows[0]);
  }

  const employeeId = randomUUID();

  const countResult = await queryPostgres<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM employees`,
  );

  const employeeNumber =
    1001 + Number(countResult.rows[0]?.count ?? "0");

  const result = await queryPostgres<EmployeeRow>(
    `
    INSERT INTO employees (
      id,
      first_name,
      last_name,
      email,
      phone,
      department_id,
      job_title,
      contract_type,
      hire_date,
      base_salary,
      status,
      iban,
      city,
      country,
      civility,
      matricule,
      address,
      postal_code,
      social_security_number,
      category,
      coefficient,
      classification_index,
      qualification,
      contract_hours,
      pas_rate,
      meal_ticket_5,
      meal_ticket_1650,
      contract_end_date,
      entra_object_id,
      entra_user_principal_name,
      directory_role
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
      $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
    )
    RETURNING *
    `,
    [
      employeeId,
      identity.firstName,
      identity.lastName,
      identity.email,
      "n/c",
      "dep-001",
      input.role === "admin"
        ? "Administrateur"
        : input.role === "hr"
          ? "Responsable RH"
          : "À renseigner",
      "CDI",
      new Date().toISOString().slice(0, 10),
      0,
      "active",
      "",
      "LEVALLOIS PERRET",
      "France",
      "M",
      String(employeeNumber),
      "",
      "",
      "",
      "Non Cadre",
      "220",
      "1.3.1",
      "",
      151.67,
      0,
      0,
      0,
      null,
      identity.oid || null,
      identity.email || null,
      input.role,
    ],
  );

  await ensureDocumentPack(employeeId);

  return mapEmployee(result.rows[0]);
}
