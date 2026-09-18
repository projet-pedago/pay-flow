import { Router } from "express";
import { z } from "zod";
import { requireStaff } from "../auth.js";
import { id, loadStore, mutate } from "../lib/store.js";

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  budget: z.number().nonnegative(),
  color: z.string().min(4),
});

export const departmentsRouter = Router();
departmentsRouter.use(requireStaff);

departmentsRouter.get("/", (_req, res) => {
  res.json(loadStore().departments);
});

departmentsRouter.post("/", (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides", details: parsed.error.flatten() });
    return;
  }
  const department = mutate((store) => {
    const created = { id: id(), ...parsed.data };
    store.departments.push(created);
    return created;
  });
  res.status(201).json(department);
});

departmentsRouter.put("/:id", (req, res) => {
  const parsed = schema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }
  const updated = mutate((store) => {
    const index = store.departments.findIndex((item) => item.id === req.params.id);
    if (index < 0) return null;
    store.departments[index] = { ...store.departments[index], ...parsed.data };
    return store.departments[index];
  });
  if (!updated) {
    res.status(404).json({ error: "Département introuvable" });
    return;
  }
  res.json(updated);
});

departmentsRouter.delete("/:id", (req, res) => {
  const store = loadStore();
  const used = store.employees.some((employee) => employee.departmentId === req.params.id);
  if (used) {
    res.status(409).json({ error: "Ce département a encore des employés" });
    return;
  }
  const removed = mutate((current) => {
    const index = current.departments.findIndex((item) => item.id === req.params.id);
    if (index < 0) return false;
    current.departments.splice(index, 1);
    return true;
  });
  if (!removed) {
    res.status(404).json({ error: "Département introuvable" });
    return;
  }
  res.status(204).end();
});
