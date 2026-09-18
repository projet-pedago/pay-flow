import { Router } from "express";
import { z } from "zod";
import { getUser } from "../auth.js";
import { UNLINKED_EMPLOYEE_MESSAGE } from "../lib/entra-link.js";
import { loadStore, mutate } from "../lib/store.js";

export const meProfileRouter = Router();

meProfileRouter.get("/profile", (req, res) => {
  const user = getUser(req);
  const store = loadStore();
  if (!user.employeeId) {
    res.json({ employee: null, department: null, settings: store.settings });
    return;
  }
  const employee = store.employees.find((item) => item.id === user.employeeId);
  if (!employee) {
    res.status(404).json({ error: "Fiche introuvable" });
    return;
  }
  const department = store.departments.find((item) => item.id === employee.departmentId);
  res.json({ employee, department, settings: store.settings });
});

meProfileRouter.put("/profile", (req, res) => {
  const user = getUser(req);
  if (!user.employeeId) {
    res.status(409).json({ error: UNLINKED_EMPLOYEE_MESSAGE });
    return;
  }
  const parsed = z
    .object({
      phone: z.string().min(3).optional(),
      city: z.string().min(1).optional(),
      country: z.string().min(1).optional(),
      iban: z.string().min(4).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }
  const updated = mutate((store) => {
    const index = store.employees.findIndex((item) => item.id === user.employeeId);
    if (index < 0) return null;
    store.employees[index] = { ...store.employees[index], ...parsed.data };
    return store.employees[index];
  });
  if (!updated) {
    res.status(404).json({ error: "Fiche introuvable" });
    return;
  }
  res.json(updated);
});
