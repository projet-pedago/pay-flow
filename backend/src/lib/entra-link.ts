import type { Employee, Role, Store } from "../types.js";
import { id, loadStore, mutate } from "./store.js";

export const UNLINKED_EMPLOYEE_MESSAGE =
  "Votre fiche PayRollFlow se crée à la première connexion Microsoft. Reconnectez-vous si elle n’apparaît pas encore.";

const DOCUMENT_PACK = [
  { key: "cni" as const, label: "Pièce d'identité" },
  { key: "rib" as const, label: "RIB / IBAN" },
  { key: "contrat" as const, label: "Contrat de travail" },
  { key: "vitale" as const, label: "Carte Vitale / CNAM" },
];

export type MicrosoftProfileInput = {
  oid: string;
  email: string;
  name: string;
  givenName?: string;
  familyName?: string;
  role: Role;
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
  if (given && surname) return { firstName: given, lastName: surname };
  const parts = user.displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] ?? "" };
  }
  return { firstName: parts[0] ?? user.displayName.trim(), lastName: "" };
}

export function findEmployeeForMicrosoft(
  employees: Employee[],
  identity: { id: string; email: string },
): Employee | undefined {
  const oid = identity.id.trim();
  const email = normalizeMicrosoftEmail(identity.email);

  if (oid) {
    const byOid = employees.find((item) => item.entraObjectId === oid);
    if (byOid) return byOid;
  }

  if (email) {
    const byUpn = employees.find((item) => item.entraUserPrincipalName?.toLowerCase() === email);
    if (byUpn) return byUpn;
  }

  return undefined;
}

function ensureDocumentPack(store: Store, employeeId: string): void {
  for (const doc of DOCUMENT_PACK) {
    if (store.documents.some((item) => item.employeeId === employeeId && item.key === doc.key)) continue;
    store.documents.push({
      id: `${employeeId}-${doc.key}`,
      employeeId,
      key: doc.key,
      label: doc.label,
      status: "missing",
      updatedAt: new Date().toISOString(),
    });
  }
}

export function upsertMicrosoftEmployee(store: Store, input: MicrosoftProfileInput): Employee {
  const oid = input.oid.trim();
  const email = normalizeMicrosoftEmail(input.email);
  const names = identityNamesFromGraph({
    givenName: input.givenName,
    surname: input.familyName,
    displayName: input.name || email,
  });
  const firstName = names.firstName || email.split("@")[0] || "Collaborateur";
  const lastName = names.lastName;
  const current = findEmployeeForMicrosoft(store.employees, { id: oid, email });

  if (current) {
    const alreadyProvisioned =
      current.entraObjectId === oid &&
      current.entraUserPrincipalName === email &&
      current.email === email &&
      current.firstName === firstName &&
      current.lastName === lastName &&
      current.directoryRole === input.role;
    if (!alreadyProvisioned) {
      current.entraObjectId = oid || current.entraObjectId;
      current.entraUserPrincipalName = email || current.entraUserPrincipalName;
      current.email = email || current.email;
      current.firstName = firstName;
      current.lastName = lastName;
      current.directoryRole = input.role;
    }
    ensureDocumentPack(store, current.id);
    return current;
  }

  const departmentId = store.departments[0]?.id ?? "dep-001";
  const created: Employee = {
    id: id(),
    firstName,
    lastName,
    email,
    phone: "n/c",
    departmentId,
    jobTitle: input.role === "admin" ? "Administrateur" : input.role === "hr" ? "Responsable RH" : "À renseigner",
    contractType: "CDI",
    hireDate: new Date().toISOString().slice(0, 10),
    baseSalary: 0,
    status: "active",
    iban: "",
    city: store.settings.companyCity || "",
    country: "France",
    civility: "M",
    matricule: String(1000 + store.employees.length + 1),
    address: "",
    postalCode: "",
    socialSecurityNumber: "",
    category: "Non Cadre",
    coefficient: "220",
    classificationIndex: "1.3.1",
    qualification: "",
    contractHours: store.settings.monthlyHours || 151.67,
    pasRate: 0,
    mealTicket5: 0,
    mealTicket1650: 0,
    entraObjectId: oid,
    entraUserPrincipalName: email,
    directoryRole: input.role,
  };
  store.employees.push(created);
  ensureDocumentPack(store, created.id);
  return created;
}

function identityFromInput(input: MicrosoftProfileInput): { firstName: string; lastName: string; email: string; oid: string } {
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
    firstName: names.firstName || email.split("@")[0] || "Collaborateur",
    lastName: names.lastName,
  };
}

export function provisionMicrosoftProfile(input: MicrosoftProfileInput): Employee | undefined {
  const { oid, email } = identityFromInput(input);
  if (!oid && !email) return undefined;
  const snapshot = loadStore();
  const current = findEmployeeForMicrosoft(snapshot.employees, { id: oid, email });
  if (current) {
    const names = identityFromInput(input);
    const packComplete = DOCUMENT_PACK.every((doc) =>
      snapshot.documents.some((item) => item.employeeId === current.id && item.key === doc.key),
    );
    const alreadyProvisioned =
      current.entraObjectId === oid &&
      current.entraUserPrincipalName === email &&
      current.email === email &&
      current.firstName === names.firstName &&
      current.lastName === names.lastName &&
      current.directoryRole === input.role &&
      packComplete;
    if (alreadyProvisioned) return current;
  }
  return mutate((store) => upsertMicrosoftEmployee(store, input));
}
