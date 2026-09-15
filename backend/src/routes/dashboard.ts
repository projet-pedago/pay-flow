import { Router } from "express";
import { loadStore } from "../lib/store.js";

export const dashboardRouter = Router();

dashboardRouter.get("/", (_req, res) => {
  const store = loadStore();
  const latest = [...store.periods].sort((a, b) => b.year - a.year || b.month - a.month)[0];
  const latestSlips = store.payslips.filter((item) => item.periodId === latest?.id);
  const activeEmployees = store.employees.filter((item) => item.status !== "terminated");

  const byDepartment = store.departments.map((department) => {
    const members = activeEmployees.filter((item) => item.departmentId === department.id);
    const payroll = latestSlips
      .filter((slip) => members.some((member) => member.id === slip.employeeId))
      .reduce((sum, slip) => sum + slip.employerCost, 0);
    return {
      id: department.id,
      name: department.name,
      color: department.color,
      headcount: members.length,
      payroll,
      budget: department.budget,
    };
  });

  const history = [...store.periods]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((period) => {
      const slips = store.payslips.filter((item) => item.periodId === period.id);
      return {
        id: period.id,
        label: `${String(period.month).padStart(2, "0")}/${period.year}`,
        status: period.status,
        gross: slips.reduce((sum, slip) => sum + slip.gross, 0),
        net: slips.reduce((sum, slip) => sum + slip.net, 0),
        employerCost: slips.reduce((sum, slip) => sum + slip.employerCost, 0),
      };
    });

  res.json({
    settings: store.settings,
    kpis: {
      headcount: activeEmployees.length,
      onLeave: store.employees.filter((item) => item.status === "on_leave").length,
      gross: latestSlips.reduce((sum, slip) => sum + slip.gross, 0),
      net: latestSlips.reduce((sum, slip) => sum + slip.net, 0),
      employerCost: latestSlips.reduce((sum, slip) => sum + slip.employerCost, 0),
      averageNet: latestSlips.length
        ? latestSlips.reduce((sum, slip) => sum + slip.net, 0) / latestSlips.length
        : 0,
    },
    latestPeriod: latest ?? null,
    byDepartment,
    history,
    alerts: [
      latest?.status === "draft" ? "Le cycle de paie du mois en cours n'est pas encore calculé." : null,
      latest?.status === "calculated" ? "La paie est calculée mais pas encore validée." : null,
      store.employees.some((item) => item.status === "on_leave")
        ? `${store.employees.filter((item) => item.status === "on_leave").length} personne(s) en congé ce mois-ci.`
        : null,
    ].filter(Boolean),
  });
});
