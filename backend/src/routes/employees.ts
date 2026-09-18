import { Router } from "express";
import { z } from "zod";
import { getUser, requireAdmin, requireStaff } from "../auth.js";
import { isPayrollEmployee } from "../lib/directory-role.js";
import { loadStore, mutate } from "../lib/store.js";

const employeePatchSchema = z.object({
  phone: z.string().min(3).optional(),
  departmentId: z.string().min(1).optional(),
  jobTitle: z.string().min(1).optional(),
  contractType: z.enum(["CDI", "CDD", "Stage", "Alternance"]).optional(),
  hireDate: z.string().min(4).optional(),
  baseSalary: z.number().min(0).optional(),
  status: z.enum(["active", "on_leave", "terminated"]).optional(),
  iban: z.string().optional(),
  city: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
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

employeesRouter.post("/import", requireAdmin, (_req, res) => {
  res.status(410).json({
    error: "Les fiches sont créées automatiquement à la première connexion Microsoft. Complétez ensuite le contrat et le salaire.",
  });
});

employeesRouter.post("/", requireAdmin, (_req, res) => {
  res.status(410).json({
    error: "Les fiches sont créées automatiquement à la première connexion Microsoft. Complétez ensuite le contrat et le salaire.",
  });
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

employeesRouter.put("/:id", (req, res) => {
  const parsed = employeePatchSchema.safeParse(req.body);
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
    const patch = { ...parsed.data, contractEndDate: parsed.data.contractEndDate || undefined };
    store.employees[index] = { ...store.employees[index], ...patch };
    return { employee: store.employees[index] };
  });
  if (!updated) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  if ("forbidden" in updated) {
    res.status(403).json({ error: "Cette fiche n’est modifiable que par un administrateur." });
    return;
  }
  res.json(updated.employee);
});

employeesRouter.delete("/:id", requireAdmin, (req, res) => {
  const removed = mutate((store) => {
    const index = store.employees.findIndex((item) => item.id === req.params.id);
    if (index < 0) return false;
    store.employees.splice(index, 1);
    store.payslips = store.payslips.filter((item) => item.employeeId !== req.params.id);
    store.leaves = store.leaves.filter((item) => item.employeeId !== req.params.id);
    store.advances = store.advances.filter((item) => item.employeeId !== req.params.id);
    store.documents = store.documents.filter((item) => item.employeeId !== req.params.id);
    return true;
  });
  if (!removed) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  res.status(204).end();
});
