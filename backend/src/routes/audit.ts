import { Router } from "express";
import { requireAdmin } from "../auth.js";
import { loadStore } from "../lib/store.js";

export const auditRouter = Router();
auditRouter.use(requireAdmin);

auditRouter.get("/", (_req, res) => {
  const store = loadStore();
  res.json(store.auditLog ?? []);
});
