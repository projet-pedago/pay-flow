import { Router } from "express";
import { getUser, requireAuth } from "../auth.js";
import { isStaff } from "../lib/roles.js";
import { loadStore } from "../lib/store.js";

function monthLabelFr(year: number, month: number) {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
}

export const attestationsRouter = Router();
attestationsRouter.use(requireAuth);

attestationsRouter.get("/:employeeId/:kind", (req, res) => {
  const kind = req.params.kind;
  if (kind !== "travail" && kind !== "salaire") {
    res.status(400).json({ error: "Type d'attestation inconnu" });
    return;
  }
  const user = getUser(req);
  if (!isStaff(user.role) && user.employeeId !== req.params.employeeId) {
    res.status(403).json({ error: "Cette attestation ne vous appartient pas" });
    return;
  }
  const store = loadStore();
  const employee = store.employees.find((item) => item.id === req.params.employeeId);
  if (!employee) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  const department = store.departments.find((item) => item.id === employee.departmentId);
  const periods = [...store.periods].sort((a, b) => b.year - a.year || b.month - a.month);
  const last = periods
    .map((period) => ({
      period,
      slip: store.payslips.find((item) => item.employeeId === employee.id && item.periodId === period.id && !item.superseded),
    }))
    .find((item) => item.slip);

  res.json({
    kind,
    title: kind === "travail" ? "Attestation de travail" : "Certificat de salaire",
    issuedAt: new Date().toISOString(),
    company: store.settings,
    employee,
    departmentName: department?.name ?? "",
    lastPayslip: last?.slip
      ? {
          periodLabel: monthLabelFr(last.period.year, last.period.month),
          gross: last.slip.gross,
          net: last.slip.net,
          employerCost: last.slip.employerCost,
        }
      : undefined,
  });
});
