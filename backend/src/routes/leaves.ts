import { Router } from "express";
import { z } from "zod";
import { getUser, requireAdmin, requireAuth } from "../auth.js";
import { countWeekdays, LEAVE_LABELS } from "../lib/dates.js";
import { notifyAdmins, notifyEmployee } from "../lib/notify.js";
import { id, loadStore, mutate } from "../lib/store.js";

export const leavesRouter = Router();
leavesRouter.use(requireAuth);

leavesRouter.get("/", (req, res) => {
  const user = getUser(req);
  const store = loadStore();
  const leaves =
    user.role === "admin" ? store.leaves : store.leaves.filter((item) => item.employeeId === user.employeeId);
  const decorated = [...leaves]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((leave) => {
      const employee = store.employees.find((item) => item.id === leave.employeeId);
      return { ...leave, employeeName: employee ? `${employee.firstName} ${employee.lastName}` : leave.employeeId };
    });
  const balances = store.employees
    .filter((employee) => (user.role === "admin" ? true : employee.id === user.employeeId))
    .map((employee) => {
      const approved = store.leaves.filter((item) => item.employeeId === employee.id && item.status === "approved");
      const usedCp = approved.filter((item) => item.type === "cp").reduce((sum, item) => sum + item.days, 0);
      const usedRtt = approved.filter((item) => item.type === "rtt").reduce((sum, item) => sum + item.days, 0);
      return {
        employeeId: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        cp: { acquired: 25, used: usedCp, remaining: 25 - usedCp },
        rtt: { acquired: 10, used: usedRtt, remaining: 10 - usedRtt },
      };
    });
  res.json({ leaves: decorated, balances, labels: LEAVE_LABELS });
});

leavesRouter.post("/", (req, res) => {
  const user = getUser(req);
  const parsed = z
    .object({
      employeeId: z.string().optional(),
      type: z.enum(["cp", "rtt", "maladie", "sans_solde"]),
      startDate: z.string(),
      endDate: z.string(),
      reason: z.string().min(2),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Demande incomplète" });
    return;
  }
  const employeeId = user.role === "admin" ? parsed.data.employeeId ?? user.employeeId : user.employeeId;
  if (!employeeId) {
    res.status(400).json({ error: "Employé manquant" });
    return;
  }
  const days = countWeekdays(parsed.data.startDate, parsed.data.endDate);
  if (days <= 0) {
    res.status(400).json({ error: "Période invalide" });
    return;
  }
  const created = mutate((store) => {
    const leave = {
      id: id(),
      employeeId,
      type: parsed.data.type,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      days,
      reason: parsed.data.reason,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    store.leaves.unshift(leave);
    const employee = store.employees.find((item) => item.id === employeeId);
    notifyAdmins(store, {
      title: "Nouvelle demande d'absence",
      body: `${employee?.firstName ?? ""} ${employee?.lastName ?? ""} · ${LEAVE_LABELS[leave.type]} · ${days} j`,
      link: "/admin/conges",
    });
    return leave;
  });
  res.status(201).json(created);
});

leavesRouter.post("/:id/decide", requireAdmin, (req, res) => {
  const parsed = z.object({ status: z.enum(["approved", "rejected"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Décision invalide" });
    return;
  }
  const updated = mutate((store) => {
    const leave = store.leaves.find((item) => item.id === req.params.id);
    if (!leave) return null;
    leave.status = parsed.data.status;
    leave.decidedAt = new Date().toISOString();
    notifyEmployee(store, leave.employeeId, {
      title: parsed.data.status === "approved" ? "Absence acceptée" : "Absence refusée",
      body: `${LEAVE_LABELS[leave.type]} du ${leave.startDate} au ${leave.endDate}`,
      link: "/espace/conges",
    });
    return leave;
  });
  if (!updated) {
    res.status(404).json({ error: "Demande introuvable" });
    return;
  }
  res.json(updated);
});
