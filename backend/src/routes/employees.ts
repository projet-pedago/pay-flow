import { Router } from "express";
import { z } from "zod";
import { DEMO_EMPLOYEE_PASSWORD } from "../auth-constants.js";
import { hashPassword, requireAdmin } from "../auth.js";
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
});

export const employeesRouter = Router();
employeesRouter.use(requireAdmin);

employeesRouter.get("/", (_req, res) => {
  const { employees } = loadStore();
  res.json(employees);
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
    const created = { id: id(), ...parsed.data };
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
