import { Router } from "express";
import { z } from "zod";
import { getUser, requireAdmin, requireAuth } from "../auth.js";
import { advanceQuota } from "../lib/advance-cap.js";
import { notifyAdmins, notifyEmployee } from "../lib/notify.js";
import { id, loadStore, mutate } from "../lib/store.js";

export const advancesRouter = Router();
advancesRouter.use(requireAuth);

advancesRouter.get("/quota", (req, res) => {
  const user = getUser(req);
  if (!user.employeeId) {
    res.status(400).json({ error: "Compte sans fiche employé" });
    return;
  }
  const now = new Date();
  res.json(advanceQuota(loadStore(), user.employeeId, now.getFullYear(), now.getMonth() + 1));
});

advancesRouter.get("/", (req, res) => {
  const user = getUser(req);
  const store = loadStore();
  const items =
    user.role === "admin" ? store.advances : store.advances.filter((item) => item.employeeId === user.employeeId);
  res.json(
    [...items]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((advance) => {
        const employee = store.employees.find((item) => item.id === advance.employeeId);
        return { ...advance, employeeName: employee ? `${employee.firstName} ${employee.lastName}` : advance.employeeId };
      }),
  );
});

advancesRouter.post("/", (req, res) => {
  const user = getUser(req);
  const parsed = z
    .object({
      amount: z.number().positive(),
      year: z.number().int(),
      month: z.number().int().min(1).max(12),
      reason: z.string().min(2),
    })
    .safeParse(req.body);
  if (!parsed.success || !user.employeeId) {
    res.status(400).json({ error: "Demande incomplète" });
    return;
  }
  const created = mutate((store) => {
    const quota = advanceQuota(store, user.employeeId!, parsed.data.year, parsed.data.month);
    if (parsed.data.amount > quota.remaining + 0.005) {
      return {
        error: `Acompte trop élevé : il reste ${quota.remaining.toFixed(2)} € ce mois-ci (plafond ${Math.round(quota.ratio * 100)} % du dernier net).`,
      };
    }
    const advance = {
      id: id(),
      employeeId: user.employeeId!,
      amount: parsed.data.amount,
      year: parsed.data.year,
      month: parsed.data.month,
      reason: parsed.data.reason,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    store.advances.unshift(advance);
    const employee = store.employees.find((item) => item.id === user.employeeId);
    notifyAdmins(store, {
      title: "Demande d'acompte",
      body: `${employee?.firstName ?? ""} ${employee?.lastName ?? ""} · ${advance.amount} €`,
      link: "/admin/acomptes",
    });
    return { advance };
  });
  if ("error" in created) {
    res.status(400).json({ error: created.error });
    return;
  }
  res.status(201).json(created.advance);
});

advancesRouter.post("/:id/decide", requireAdmin, (req, res) => {
  const parsed = z.object({ status: z.enum(["approved", "rejected"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Décision invalide" });
    return;
  }
  const updated = mutate((store) => {
    const advance = store.advances.find((item) => item.id === req.params.id);
    if (!advance) return null;
    if (parsed.data.status === "approved" && advance.status === "pending") {
      const others = store.advances.filter((item) => item.id !== advance.id);
      const probe = { ...store, advances: others };
      const quota = advanceQuota(probe, advance.employeeId, advance.year, advance.month);
      if (advance.amount > quota.remaining + 0.005) {
        return { error: `Plafond dépassé : il reste ${quota.remaining.toFixed(2)} € pour ce mois.` };
      }
    }
    advance.status = parsed.data.status;
    advance.decidedAt = new Date().toISOString();
    notifyEmployee(store, advance.employeeId, {
      title: parsed.data.status === "approved" ? "Acompte accepté" : "Acompte refusé",
      body: `${advance.amount} € pour ${String(advance.month).padStart(2, "0")}/${advance.year}`,
      link: "/espace/acomptes",
    });
    return { advance };
  });
  if (!updated) {
    res.status(404).json({ error: "Demande introuvable" });
    return;
  }
  if ("error" in updated) {
    res.status(400).json({ error: updated.error });
    return;
  }
  res.json(updated.advance);
});
