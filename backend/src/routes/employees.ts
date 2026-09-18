import { Router } from "express";
import { z } from "zod";
import { getUser, requireAdmin, requireStaff } from "../auth.js";
import { parseCsv } from "../lib/csv.js";
import { directoryRoleOf, effectivePayflowRole, expectedPayflowRole, isPayrollEmployee } from "../lib/directory-role.js";
import {
  associateMicrosoftAccount,
  foldName,
  identityNamesFromGraph,
  namesMatch,
} from "../lib/entra-link.js";
import { listPayflowEntraUsers, withEmployeeLinks } from "../lib/entra-graph.js";
import type { Employee, Role } from "../types.js";
import { id, loadStore, mutate } from "../lib/store.js";

const employeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(3),
  departmentId: z.string().min(1),
  jobTitle: z.string().min(1),
  contractType: z.enum(["CDI", "CDD", "Stage", "Alternance"]),
  hireDate: z.string().min(4),
  baseSalary: z.number().positive(),
  status: z.enum(["active", "on_leave", "terminated"]),
  iban: z.string().min(4),
  city: z.string().min(1),
  country: z.string().min(1),
  civility: z.enum(["M", "Mme"]).optional(),
  matricule: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  category: z.string().optional(),
  coefficient: z.string().optional(),
  classificationIndex: z.string().optional(),
  qualification: z.string().optional(),
  contractHours: z.number().positive().optional(),
  pasRate: z.number().min(0).max(1).optional(),
  mealTicket5: z.number().min(0).optional(),
  mealTicket1650: z.number().min(0).optional(),
  contractEndDate: z.string().optional().or(z.literal("")),
  directoryRole: z.enum(["admin", "hr", "employee"]).optional(),
});

const identityCreateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  directoryRole: z.enum(["admin", "hr", "employee"]).default("employee"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  jobTitle: z.string().optional(),
  contractType: z.enum(["CDI", "CDD", "Stage", "Alternance"]).optional(),
  hireDate: z.string().optional(),
  baseSalary: z.number().positive().optional(),
  status: z.enum(["active", "on_leave", "terminated"]).optional(),
  iban: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  civility: z.enum(["M", "Mme"]).optional(),
  matricule: z.string().optional(),
  address: z.string().optional(),
  postalCode: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  category: z.string().optional(),
  coefficient: z.string().optional(),
  classificationIndex: z.string().optional(),
  qualification: z.string().optional(),
  contractHours: z.number().positive().optional(),
  pasRate: z.number().min(0).max(1).optional(),
  mealTicket5: z.number().min(0).optional(),
  mealTicket1650: z.number().min(0).optional(),
  contractEndDate: z.string().optional().or(z.literal("")),
});

function slugIdentityEmail(firstName: string, lastName: string): string {
  const slug = `${firstName}.${lastName}`
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
  return `${slug || "identite"}@identite.payrollflow.local`;
}

function withLegalDefaults(
  data: z.infer<typeof employeeSchema> & { directoryRole?: Role },
  store: {
    employees: { matricule?: string }[];
    departments: { id: string }[];
    settings: { monthlyHours: number; companyCity: string };
  },
) {
  const directoryRole = data.directoryRole ?? "employee";
  return {
    ...data,
    directoryRole,
    civility: data.civility ?? "M",
    matricule: data.matricule?.trim() || String(1000 + store.employees.length + 1),
    address: data.address ?? "",
    postalCode: data.postalCode ?? "",
    socialSecurityNumber: data.socialSecurityNumber ?? "",
    category: data.category ?? "Non Cadre",
    coefficient: data.coefficient ?? "220",
    classificationIndex: data.classificationIndex ?? "1.3.1",
    qualification: data.qualification ?? "",
    contractHours: data.contractHours ?? store.settings.monthlyHours,
    pasRate: data.pasRate ?? 0,
    mealTicket5: data.mealTicket5 ?? 0,
    mealTicket1650: data.mealTicket1650 ?? 0,
    contractEndDate: data.contractEndDate || undefined,
  };
}

function identityToEmployeeInput(
  data: z.infer<typeof identityCreateSchema>,
  store: {
    employees: { matricule?: string; email: string }[];
    departments: { id: string }[];
    settings: { monthlyHours: number; companyCity: string };
  },
): z.infer<typeof employeeSchema> & { directoryRole: Role } {
  const directoryRole = data.directoryRole;
  const staffIdentity = directoryRole !== "employee";
  let email = data.email?.trim() || "";
  if (!email) {
    email = slugIdentityEmail(data.firstName, data.lastName);
    let n = 2;
    while (store.employees.some((item) => item.email.toLowerCase() === email.toLowerCase())) {
      email = slugIdentityEmail(data.firstName, `${data.lastName}${n}`);
      n += 1;
    }
  }
  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    email,
    phone: data.phone?.trim() || "n/c",
    departmentId: data.departmentId || store.departments[0]?.id || "dep-001",
    jobTitle:
      data.jobTitle?.trim() ||
      (directoryRole === "admin" ? "Administrateur" : directoryRole === "hr" ? "Responsable RH" : ""),
    contractType: data.contractType ?? "CDI",
    hireDate: data.hireDate || new Date().toISOString().slice(0, 10),
    baseSalary: data.baseSalary && data.baseSalary > 0 ? data.baseSalary : staffIdentity ? 1 : 0,
    status: data.status ?? "active",
    iban: data.iban?.trim() || "FR76 A COMPLETER",
    city: data.city?.trim() || store.settings.companyCity,
    country: data.country?.trim() || "France",
    civility: data.civility,
    matricule: data.matricule,
    address: data.address,
    postalCode: data.postalCode,
    socialSecurityNumber: data.socialSecurityNumber,
    category: data.category,
    coefficient: data.coefficient,
    classificationIndex: data.classificationIndex,
    qualification: data.qualification,
    contractHours: data.contractHours,
    pasRate: data.pasRate,
    mealTicket5: data.mealTicket5,
    mealTicket1650: data.mealTicket1650,
    contractEndDate: data.contractEndDate,
    directoryRole,
  };
}

export const employeesRouter = Router();
employeesRouter.use(requireStaff);

employeesRouter.get("/export", (_req, res) => {
  const { employees, departments } = loadStore();
  const roster = employees.filter(isPayrollEmployee);
  const header = [
    "matricule",
    "civility",
    "firstName",
    "lastName",
    "email",
    "jobTitle",
    "department",
    "contractType",
    "hireDate",
    "contractEndDate",
    "status",
    "baseSalary",
    "city",
  ];
  const lines = [
    header.join(";"),
    ...roster.map((employee) => {
      const department = departments.find((item) => item.id === employee.departmentId);
      return [
        employee.matricule,
        employee.civility,
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.jobTitle,
        department?.name ?? "",
        employee.contractType,
        employee.hireDate,
        employee.contractEndDate ?? "",
        employee.status,
        String(employee.baseSalary).replace(".", ","),
        employee.city,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(";");
    }),
  ];
  res.json({ filename: "effectifs-payrollflow.csv", csv: `${lines.join("\n")}\n` });
});

employeesRouter.get("/", (req, res) => {
  const role = getUser(req).role;
  const { employees } = loadStore();
  if (role === "admin" && req.query.scope === "directory") {
    res.json(employees);
    return;
  }
  res.json(employees.filter(isPayrollEmployee));
});

employeesRouter.post("/import", requireAdmin, (req, res) => {
  const parsed = z.object({ csv: z.string().min(10) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Fichier CSV manquant" });
    return;
  }
  const rows = parseCsv(parsed.data.csv);
  const header = rows.shift()?.map((item) => item.trim()) ?? [];
  const required = ["firstName", "lastName", "email", "departmentCode", "jobTitle", "baseSalary"];
  if (required.some((key) => !header.includes(key))) {
    res.status(400).json({
      error: "En-têtes attendus : firstName,lastName,email,phone,departmentCode,jobTitle,contractType,hireDate,baseSalary,iban,city,country",
    });
    return;
  }
  type ImportRow = { line: number; status: "created" | "skipped" | "error"; email?: string; reason?: string };
  const result = mutate((store) => {
    const added: Employee[] = [];
    const report: ImportRow[] = [];
    rows.forEach((cols, index) => {
      const line = index + 2;
      const row = Object.fromEntries(header.map((key, col) => [key, cols[col] ?? ""]));
      const email = row.email?.trim().toLowerCase() ?? "";
      if (!row.firstName || !row.lastName || !email) {
        report.push({ line, status: "error", email: row.email, reason: "Nom, prénom ou email manquant" });
        return;
      }
      const department = store.departments.find((item) => item.code === row.departmentCode || item.id === row.departmentCode);
      if (!department) {
        report.push({ line, status: "error", email, reason: `Département inconnu (${row.departmentCode || "vide"})` });
        return;
      }
      if (store.employees.some((item) => item.email.toLowerCase() === email)) {
        report.push({ line, status: "skipped", email, reason: "Email déjà présent" });
        return;
      }
      const baseSalary = Number(String(row.baseSalary).replace(",", "."));
      if (!Number.isFinite(baseSalary) || baseSalary <= 0) {
        report.push({ line, status: "error", email, reason: "Salaire brut invalide" });
        return;
      }
      const employee = {
        id: id(),
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email.trim(),
        phone: row.phone || "n/c",
        departmentId: department.id,
        jobTitle: row.jobTitle,
        contractType: (["CDI", "CDD", "Stage", "Alternance"].includes(row.contractType) ? row.contractType : "CDI") as
          | "CDI"
          | "CDD"
          | "Stage"
          | "Alternance",
        hireDate: row.hireDate || new Date().toISOString().slice(0, 10),
        baseSalary,
        status: "active" as const,
        iban: row.iban || "FR76 A COMPLETER",
        city: row.city || store.settings.companyCity,
        country: row.country || "France",
        civility: "M" as const,
        matricule: String(1000 + store.employees.length + 1),
        address: "",
        postalCode: "",
        socialSecurityNumber: "",
        category: "Non Cadre",
        coefficient: "220",
        classificationIndex: "1.3.1",
        qualification: "",
        contractHours: store.settings.monthlyHours,
        pasRate: 0,
        mealTicket5: 0,
        mealTicket1650: 0,
        directoryRole: "employee" as const,
      };
      store.employees.push(employee);
      added.push(employee);
      report.push({ line, status: "created", email: employee.email });
    });
    return { added, report };
  });
  res.status(201).json({
    imported: result.added.length,
    skipped: result.report.filter((item) => item.status === "skipped").length,
    errors: result.report.filter((item) => item.status === "error").length,
    report: result.report,
    employees: result.added,
  });
});

employeesRouter.get("/:id/microsoft-candidates", requireAdmin, async (req, res) => {
  const employee = loadStore().employees.find((item) => item.id === req.params.id);
  if (!employee) {
    res.status(404).json({ error: "Identité introuvable" });
    return;
  }
  try {
    const raw = await listPayflowEntraUsers();
    const linked = withEmployeeLinks(raw, loadStore().employees);
    const candidates = linked.map((account) => {
      const graphUser = {
        id: account.id,
        displayName: account.displayName,
        givenName: account.givenName,
        surname: account.surname,
        userPrincipalName: account.userPrincipalName,
        roles: account.roles,
      };
      const names = identityNamesFromGraph(graphUser);
      const nameMatches =
        namesMatch(employee, names) ||
        foldName(`${employee.firstName} ${employee.lastName}`) === foldName(account.displayName);
      const roleMatches = effectivePayflowRole(account.roles) === expectedPayflowRole(directoryRoleOf(employee));
      const takenByOther = Boolean(account.linkedEmployeeId && account.linkedEmployeeId !== employee.id);
      return {
        ...account,
        graphFirstName: names.firstName,
        graphLastName: names.lastName,
        nameMatches,
        roleMatches,
        eligible: nameMatches && roleMatches && !takenByOther,
        reason: takenByOther
          ? `Déjà associé à ${account.linkedEmployeeName}`
          : !nameMatches
            ? "Le prénom et le nom de la fiche PayRollFlow ne correspondent pas au compte Microsoft sélectionné."
            : !roleMatches
              ? "Le rôle PayFlow du compte Microsoft ne correspond pas au type de cette identité."
              : null,
      };
    });
    res.json({
      employee: {
        id: employee.id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        directoryRole: directoryRoleOf(employee),
        jobTitle: employee.jobTitle,
      },
      candidates,
    });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Lecture Entra impossible" });
  }
});

employeesRouter.get("/:id", (req, res) => {
  const role = getUser(req).role;
  const employee = loadStore().employees.find((item) => item.id === req.params.id);
  if (!employee) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  if (role !== "admin" && !isPayrollEmployee(employee)) {
    res.status(403).json({ error: "Cette identité n’est visible que par un administrateur." });
    return;
  }
  res.json(employee);
});

employeesRouter.post("/", requireAdmin, (req, res) => {
  const parsed = identityCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }
  const employee = mutate((store) => {
    const input = identityToEmployeeInput(parsed.data, store);
    if (input.directoryRole === "employee") {
      if (!parsed.data.email) return { invalid: "L’email professionnel de la fiche RH est obligatoire." };
      if (!parsed.data.jobTitle) return { invalid: "Le poste est obligatoire pour une fiche employé." };
      if (!parsed.data.departmentId) return { invalid: "Le département est obligatoire pour une fiche employé." };
      if (!parsed.data.baseSalary || parsed.data.baseSalary <= 0) {
        return { invalid: "Le salaire brut est obligatoire pour une fiche employé." };
      }
    }
    if (!input.jobTitle) return { invalid: "Le poste est obligatoire." };
    const parsedEmployee = employeeSchema.safeParse(input);
    if (!parsedEmployee.success) {
      return { invalid: "Données invalides" };
    }
    const created = {
      id: id(),
      ...withLegalDefaults({ ...parsedEmployee.data, directoryRole: input.directoryRole }, store),
    };
    store.employees.push(created);
    return { employee: created };
  });
  if ("invalid" in employee) {
    res.status(400).json({ error: employee.invalid });
    return;
  }
  res.status(201).json(employee.employee);
});

employeesRouter.put("/:id/microsoft-link", requireAdmin, async (req, res) => {
  const parsed = z
    .object({
      entraObjectId: z.string().optional(),
      entraUserPrincipalName: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Compte Microsoft manquant" });
    return;
  }
  const oid = parsed.data.entraObjectId?.trim() ?? "";
  const upn = parsed.data.entraUserPrincipalName?.trim() ?? "";
  if (!oid && !upn) {
    const result = associateMicrosoftAccount(String(req.params.id), null);
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.employee);
    return;
  }
  try {
    const directory = withEmployeeLinks(await listPayflowEntraUsers(), loadStore().employees);
    const graphUser = directory.find(
      (item) =>
        (oid && item.id === oid) ||
        (upn && item.userPrincipalName.toLowerCase() === upn.toLowerCase()),
    );
    if (!graphUser) {
      res.status(404).json({ error: "Ce compte Microsoft n’a pas de rôle PayFlow." });
      return;
    }
    const result = associateMicrosoftAccount(String(req.params.id), {
      id: graphUser.id,
      displayName: graphUser.displayName,
      givenName: graphUser.givenName,
      surname: graphUser.surname,
      userPrincipalName: graphUser.userPrincipalName,
      roles: graphUser.roles,
    });
    if ("error" in result) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.employee);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Lecture Entra impossible" });
  }
});

employeesRouter.put("/:id", (req, res) => {
  const parsed = employeeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }
  const actor = getUser(req);
  const updated = mutate((store) => {
    const index = store.employees.findIndex((item) => item.id === req.params.id);
    if (index < 0) return null;
    if (actor.role !== "admin" && !isPayrollEmployee(store.employees[index])) {
      return { forbidden: true as const };
    }
    const patch = { ...parsed.data };
    if (actor.role !== "admin") {
      delete patch.directoryRole;
    }
    store.employees[index] = { ...store.employees[index], ...patch };
    return { employee: store.employees[index] };
  });
  if (!updated) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  if ("forbidden" in updated) {
    res.status(403).json({ error: "Cette identité n’est modifiable que par un administrateur." });
    return;
  }
  res.json(updated.employee);
});

employeesRouter.delete("/:id", (req, res) => {
  const actor = getUser(req);
  const removed = mutate((store) => {
    const index = store.employees.findIndex((item) => item.id === req.params.id);
    if (index < 0) return { missing: true as const };
    if (actor.role !== "admin" && !isPayrollEmployee(store.employees[index])) {
      return { forbidden: true as const };
    }
    store.employees.splice(index, 1);
    store.payslips = store.payslips.filter((item) => item.employeeId !== req.params.id);
    return { ok: true as const };
  });
  if ("missing" in removed) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  if ("forbidden" in removed) {
    res.status(403).json({ error: "Cette identité n’est supprimable que par un administrateur." });
    return;
  }
  res.status(204).end();
});
