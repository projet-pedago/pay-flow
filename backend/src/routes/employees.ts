import { Router } from "express";
import { z } from "zod";
import { DEMO_EMPLOYEE_PASSWORD } from "../auth-constants.js";
import { hashPassword, requireAdmin } from "../auth.js";
import { parseCsv } from "../lib/csv.js";
import { provisionEmployeeLogin } from "../lib/provision-login.js";
import type { Employee } from "../types.js";
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
});

function withLegalDefaults(
  data: z.infer<typeof employeeSchema>,
  store: { employees: { matricule?: string }[]; settings: { monthlyHours: number; companyCity: string } },
) {
  return {
    ...data,
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
  };
}

export const employeesRouter = Router();
employeesRouter.use(requireAdmin);

employeesRouter.get("/", (_req, res) => {
  const { employees } = loadStore();
  res.json(employees);
});

employeesRouter.post("/import", (req, res) => {
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
      };
      store.employees.push(employee);
      store.users.push({
        id: id(),
        email: employee.email,
        passwordHash: hashPassword(DEMO_EMPLOYEE_PASSWORD),
        role: "employee",
        name: `${employee.firstName} ${employee.lastName}`,
        employeeId: employee.id,
      });
      added.push(employee);
      report.push({ line, status: "created", email: employee.email });
      void provisionEmployeeLogin(employee.email, `${employee.firstName} ${employee.lastName}`);
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

employeesRouter.get("/:id", (req, res) => {
  const employee = loadStore().employees.find((item) => item.id === req.params.id);
  if (!employee) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  res.json(employee);
});

employeesRouter.post("/", (req, res) => {
  const parsed = employeeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }
  const employee = mutate((store) => {
    const created = { id: id(), ...withLegalDefaults(parsed.data, store) };
    store.employees.push(created);
    store.users.push({
      id: id(),
      email: created.email,
      passwordHash: hashPassword(DEMO_EMPLOYEE_PASSWORD),
      role: "employee",
      name: `${created.firstName} ${created.lastName}`,
      employeeId: created.id,
    });
    return created;
  });
  void provisionEmployeeLogin(employee.email, `${employee.firstName} ${employee.lastName}`);
  res.status(201).json(employee);
});

employeesRouter.put("/:id", (req, res) => {
  const parsed = employeeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }
  const updated = mutate((store) => {
    const index = store.employees.findIndex((item) => item.id === req.params.id);
    if (index < 0) return null;
    store.employees[index] = { ...store.employees[index], ...parsed.data };
    const user = store.users.find((item) => item.employeeId === req.params.id);
    if (user) {
      user.email = store.employees[index].email;
      user.name = `${store.employees[index].firstName} ${store.employees[index].lastName}`;
    }
    return store.employees[index];
  });
  if (!updated) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  res.json(updated);
});

employeesRouter.delete("/:id", (req, res) => {
  const removed = mutate((store) => {
    const index = store.employees.findIndex((item) => item.id === req.params.id);
    if (index < 0) return false;
    store.employees.splice(index, 1);
    store.payslips = store.payslips.filter((item) => item.employeeId !== req.params.id);
    store.users = store.users.filter((item) => item.employeeId !== req.params.id);
    return true;
  });
  if (!removed) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  res.status(204).end();
});
