import { Router } from "express";
import { z } from "zod";
import { getUser, requireStaff, requireAuth } from "../auth.js";
import { isStaff } from "../lib/roles.js";
import { pushAudit } from "../lib/audit.js";
import { countWeekdays, LEAVE_LABELS } from "../lib/dates.js";
import { leaveBalancesFor, leaveRemaining } from "../lib/leave-balance.js";
import { notifyAdmins, notifyEmployee } from "../lib/notify.js";
import { id, loadStore, mutate } from "../lib/store.js";

export const leavesRouter = Router();
leavesRouter.use(requireAuth);

leavesRouter.get("/", (req, res) => {
  const user = getUser(req);
  const store = loadStore();
  const leaves =
    isStaff(user.role) ? store.leaves : store.leaves.filter((item) => item.employeeId === user.employeeId);
  const decorated = [...leaves]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((leave) => {
      const employee = store.employees.find((item) => item.id === leave.employeeId);
      return { ...leave, employeeName: employee ? `${employee.firstName} ${employee.lastName}` : leave.employeeId };
    });
  const balances = store.employees
    .filter((employee) => (isStaff(user.role) ? true : employee.id === user.employeeId))
    .map((employee) => ({
      employeeId: employee.id,
      name: `${employee.firstName} ${employee.lastName}`,
      ...leaveBalancesFor(store, employee.id),
    }));
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
  const employeeId = isStaff(user.role) ? parsed.data.employeeId ?? user.employeeId : user.employeeId;
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
    if (parsed.data.type === "cp" || parsed.data.type === "rtt") {
      const remaining = leaveRemaining(store, employeeId, parsed.data.type);
      if (days > remaining + 0.001) {
        return { error: `Solde insuffisant : ${remaining} jour(s) restant(s) en ${parsed.data.type.toUpperCase()}.` };
      }
    }
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
    return { leave };
  });
  if ("error" in created) {
    res.status(400).json({ error: created.error });
    return;
  }
  res.status(201).json(created.leave);
});

leavesRouter.post("/:id/decide", requireStaff, (req, res) => {
  const parsed = z.object({ status: z.enum(["approved", "rejected"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Décision invalide" });
    return;
  }
  const updated = mutate((store) => {
    const leave = store.leaves.find((item) => item.id === req.params.id);
    if (!leave) return null;
    if (parsed.data.status === "approved" && (leave.type === "cp" || leave.type === "rtt")) {
      const remaining = leaveRemaining(store, leave.employeeId, leave.type, leave.id);
      if (leave.days > remaining + 0.001) {
        return { error: `Solde insuffisant : ${remaining} jour(s) restant(s) en ${leave.type.toUpperCase()}.` };
      }
    }
    leave.status = parsed.data.status;
    leave.decidedAt = new Date().toISOString();
    notifyEmployee(store, leave.employeeId, {
      title: parsed.data.status === "approved" ? "Absence acceptée" : "Absence refusée",
      body: `${LEAVE_LABELS[leave.type]} du ${leave.startDate} au ${leave.endDate}`,
      link: "/espace/conges",
    });
    const actor = getUser(req);
    pushAudit(store, {
      actorEmail: actor.email,
      action: parsed.data.status === "approved" ? "leave.approve" : "leave.reject",
      detail: `${LEAVE_LABELS[leave.type]} · ${leave.days} j · ${leave.startDate} → ${leave.endDate}`,
      link: "/admin/conges",
    });
    return { leave };
  });
  if (!updated) {
    res.status(404).json({ error: "Demande introuvable" });
    return;
  }
  if ("error" in updated) {
    res.status(400).json({ error: updated.error });
    return;
  }
  res.json(updated.leave);
});
