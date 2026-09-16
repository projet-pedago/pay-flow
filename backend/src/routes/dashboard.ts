import { Router } from "express";
import { requireAdmin } from "../auth.js";
import { loadStore } from "../lib/store.js";
import type { ContractType } from "../types.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAdmin);

function currentSlips<T extends { superseded?: boolean }>(items: T[]) {
  return items.filter((item) => !item.superseded);
}

dashboardRouter.get("/", (_req, res) => {
  const store = loadStore();
  const sorted = [...store.periods].sort((a, b) => b.year - a.year || b.month - a.month);
  const latest = sorted[0];
  const kpiPeriod =
    sorted.find((period) => currentSlips(store.payslips).some((slip) => slip.periodId === period.id)) ?? latest;
  const latestSlips = currentSlips(store.payslips).filter((item) => item.periodId === kpiPeriod?.id);
  const activeEmployees = store.employees.filter((item) => item.status !== "terminated");
  const workingDays = store.settings.workingDays || 22;
  const year = kpiPeriod?.year ?? new Date().getFullYear();
  const month = kpiPeriod?.month ?? new Date().getMonth() + 1;
  const leaveDaysMonth = store.leaves
    .filter((item) => item.status === "approved")
    .reduce((sum, item) => {
      const start = new Date(`${item.startDate}T00:00:00`);
      const end = new Date(`${item.endDate}T00:00:00`);
      const from = new Date(year, month - 1, 1);
      const to = new Date(year, month, 0);
      const a = start > from ? start : from;
      const b = end < to ? end : to;
      if (b < a) return sum;
      return sum + item.days;
    }, 0);
  const absenteeismRate =
    activeEmployees.length && workingDays ? leaveDaysMonth / (activeEmployees.length * workingDays) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10);
  const expiring = activeEmployees.filter(
    (item) => item.contractEndDate && item.contractType !== "CDI" && item.contractEndDate <= horizon,
  );

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
    .sort((a, b) => a.year - a.year || a.month - b.month)
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((period) => {
      const slips = currentSlips(store.payslips).filter((item) => item.periodId === period.id);
      return {
        id: period.id,
        label: `${String(period.month).padStart(2, "0")}/${period.year}`,
        status: period.status,
        gross: slips.reduce((sum, slip) => sum + slip.gross, 0),
        net: slips.reduce((sum, slip) => sum + slip.net, 0),
        employerCost: slips.reduce((sum, slip) => sum + slip.employerCost, 0),
      };
    });

  const employerCost = latestSlips.reduce((sum, slip) => sum + slip.employerCost, 0);
  const forecast = [0, 1, 2].map((offset) => {
    const date = new Date(year, month - 1 + offset, 1);
    return {
      label: `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`,
      employerCost,
    };
  });

  const contractTypes: ContractType[] = ["CDI", "CDD", "Stage", "Alternance"];
  const contracts = contractTypes.map((type) => ({
    type,
    count: activeEmployees.filter((item) => item.contractType === type).length,
  }));

  res.json({
    settings: store.settings,
    kpis: {
      headcount: activeEmployees.length,
      onLeave: store.employees.filter((item) => item.status === "on_leave").length,
      gross: latestSlips.reduce((sum, slip) => sum + slip.gross, 0),
      net: latestSlips.reduce((sum, slip) => sum + slip.net, 0),
      employerCost,
      averageNet: latestSlips.length ? latestSlips.reduce((sum, slip) => sum + slip.net, 0) / latestSlips.length : 0,
      averageCost: latestSlips.length ? employerCost / latestSlips.length : 0,
      absenteeismRate,
      pendingValidations:
        store.leaves.filter((item) => item.status === "pending").length +
        store.advances.filter((item) => item.status === "pending").length,
      contractsExpiring: expiring.length,
    },
    latestPeriod: latest ?? null,
    kpiPeriod: kpiPeriod ?? null,
    byDepartment,
    gender: {
      women: activeEmployees.filter((item) => item.civility === "Mme").length,
      men: activeEmployees.filter((item) => item.civility !== "Mme").length,
    },
    contracts,
    forecast,
    history,
    alerts: [
      latest?.status === "draft" ? "Le cycle de paie du mois en cours n'est pas encore calculé." : null,
      latest?.status === "calculated" ? "La paie est calculée mais pas encore validée." : null,
      store.employees.some((item) => item.status === "on_leave")
        ? `${store.employees.filter((item) => item.status === "on_leave").length} personne(s) en congé ce mois-ci.`
        : null,
    ].filter(Boolean),
    anomalies: [
      ...expiring.map((item) => ({
        severity: (item.contractEndDate! < today ? "high" : "medium") as "high" | "medium",
        title: `Contrat ${item.contractType} · ${item.firstName} ${item.lastName}`,
        detail:
          item.contractEndDate! < today
            ? `Échu le ${item.contractEndDate} — à archiver.`
            : `Expire le ${item.contractEndDate}.`,
        link: `/admin/employes/${item.id}`,
      })),
      ...store.employees
        .filter((item) => item.status !== "terminated" && item.iban.replace(/\s/g, "").length < 15)
        .map((item) => ({
          severity: "high" as const,
          title: `IBAN incomplet · ${item.firstName} ${item.lastName}`,
          detail: "Le virement SEPA sera rejeté.",
          link: `/admin/employes/${item.id}`,
        })),
      ...store.leaves
        .filter((item) => item.status === "pending")
        .map((item) => {
          const employee = store.employees.find((entry) => entry.id === item.employeeId);
          return {
            severity: "medium" as const,
            title: `Absence à valider · ${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`,
            detail: `${item.days} jour(s) du ${item.startDate} au ${item.endDate}`,
            link: "/admin/conges",
          };
        }),
      ...store.advances
        .filter((item) => item.status === "pending")
        .map((item) => {
          const employee = store.employees.find((entry) => entry.id === item.employeeId);
          return {
            severity: "medium" as const,
            title: `Acompte à valider · ${employee?.firstName ?? ""} ${employee?.lastName ?? ""}`,
            detail: `${item.amount} €`,
            link: "/admin/acomptes",
          };
        }),
      ...store.employees
        .filter((employee) => employee.status !== "terminated")
        .filter((employee) => store.documents.some((doc) => doc.employeeId === employee.id && doc.status === "missing"))
        .map((employee) => ({
          severity: "low" as const,
          title: `Dossier RH incomplet · ${employee.firstName} ${employee.lastName}`,
          detail: "Pièces manquantes (CNI, RIB, contrat ou Vitale).",
          link: "/admin/dossiers",
        })),
    ],
  });
});

dashboardRouter.get("/export", (_req, res) => {
  const store = loadStore();
  const active = store.employees.filter((item) => item.status !== "terminated");
  const header = "indicateur;valeur";
  const rows = [
    `effectif actif;${active.length}`,
    `en conge;${store.employees.filter((item) => item.status === "on_leave").length}`,
    `femmes;${active.filter((item) => item.civility === "Mme").length}`,
    `hommes;${active.filter((item) => item.civility !== "Mme").length}`,
    `CDI;${active.filter((item) => item.contractType === "CDI").length}`,
    `CDD;${active.filter((item) => item.contractType === "CDD").length}`,
    `Stage;${active.filter((item) => item.contractType === "Stage").length}`,
    `Alternance;${active.filter((item) => item.contractType === "Alternance").length}`,
  ];
  res.json({ filename: "pilotage-rh.csv", csv: `${header}\n${rows.join("\n")}\n` });
});
