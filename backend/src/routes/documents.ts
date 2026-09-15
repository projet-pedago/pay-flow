import { Router } from "express";
import { getUser, requireAuth } from "../auth.js";
import { loadStore, mutate } from "../lib/store.js";

export const documentsRouter = Router();
documentsRouter.use(requireAuth);

documentsRouter.get("/", (req, res) => {
  const user = getUser(req);
  const store = loadStore();
  const documents =
    user.role === "admin"
      ? store.documents
      : store.documents.filter((item) => item.employeeId === user.employeeId);
  const byEmployee = store.employees
    .filter((employee) => (user.role === "admin" ? employee.status !== "terminated" : employee.id === user.employeeId))
    .map((employee) => {
      const docs = documents.filter((item) => item.employeeId === employee.id);
      const missing = docs.filter((item) => item.status === "missing").length;
      return {
        employeeId: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        complete: missing === 0,
        missing,
        documents: docs,
      };
    });
  res.json(byEmployee);
});

documentsRouter.post("/:id/toggle", (req, res) => {
  const user = getUser(req);
  const updated = mutate((store) => {
    const doc = store.documents.find((item) => item.id === req.params.id);
    if (!doc) return null;
    if (user.role !== "admin" && user.employeeId !== doc.employeeId) return { forbidden: true } as const;
    doc.status = doc.status === "provided" ? "missing" : "provided";
    doc.updatedAt = new Date().toISOString();
    return doc;
  });
  if (!updated) {
    res.status(404).json({ error: "Document introuvable" });
    return;
  }
  if ("forbidden" in updated) {
    res.status(403).json({ error: "Accès refusé" });
    return;
  }
  res.json(updated);
});
