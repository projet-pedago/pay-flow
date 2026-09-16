import { Router } from "express";
import { z } from "zod";
import { getUser, requireAuth } from "../auth.js";
import { bulletinMeta } from "../lib/bulletin.js";
import { leaveDaysInMonth } from "../lib/dates.js";
import { notifyEmployee } from "../lib/notify.js";
import { calculatePayslip } from "../lib/payroll.js";
import { id, loadStore, mutate } from "../lib/store.js";

type ActionError = { error: string; status: number };

function isActionError(value: object): value is ActionError {
  return "error" in value;
}

export const payrollRouter = Router();

payrollRouter.use(async (req, res, next) => {
  await requireAuth(req, res, () => {
    const ownPayslip = req.method === "GET" && /^\/payslips\/[^/]+$/.test(req.path);
    if (ownPayslip || getUser(req).role === "admin") {
      next();
      return;
    }
    res.status(403).json({ error: "Accès administrateur requis" });
  });
});

payrollRouter.post("/preview", (req, res) => {
  const parsed = z
    .object({
      employeeId: z.string().min(1),
      workedDays: z.number().min(0).max(31),
      overtimeHours: z.number().min(0).max(80),
      bonus: z.number().min(0),
      advance: z.number().min(0).optional(),
    })
    .safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Paramètres de simulation invalides" });
    return;
  }
  const store = loadStore();
  const employee = store.employees.find((item) => item.id === parsed.data.employeeId);
  if (!employee) {
    res.status(404).json({ error: "Employé introuvable" });
    return;
  }
  const payslip = calculatePayslip({
    employee,
    periodId: "preview",
    workedDays: parsed.data.workedDays,
    overtimeHours: parsed.data.overtimeHours,
    bonus: parsed.data.bonus,
    advance: parsed.data.advance ?? 0,
    workingDays: store.settings.workingDays,
    monthlyHours: store.settings.monthlyHours,
    overtimeRate: store.settings.overtimeRate,
    smicHourly: store.settings.smicHourly,
    fillonT: store.settings.fillonT,
    rates: store.rates,
  });
  const ratio = Math.min(Math.max(parsed.data.workedDays / store.settings.workingDays, 0), 1);
  const steps = [
    {
      id: "base",
      title: "Salaire de base",
      formula: "Salaire brut contractuel du mois",
      value: payslip.baseSalary,
      hint: "Montant figé sur la fiche RH, avant prorata.",
    },
    {
      id: "hourly",
      title: "Taux horaire",
      formula: "Salaire de base ÷ horaire mensuel du contrat",
      value: payslip.hourlyRate,
      hint: `${employee.contractHours} h / mois sur cette fiche.`,
    },
    {
      id: "hours",
      title: "Heures payées",
      formula: "Horaire contrat × (jours travaillés ÷ jours ouvrés)",
      value: payslip.hours,
      hint: `${parsed.data.workedDays} j / ${store.settings.workingDays} j = ${(ratio * 100).toFixed(1)} %.`,
    },
    {
      id: "prorata",
      title: "Salaire proratisé",
      formula: "Taux horaire × heures payées",
      value: payslip.proratedBase,
      hint: "C’est la ligne « Salaire horaire » du bulletin.",
    },
    {
      id: "ot",
      title: "Heures supplémentaires",
      formula: "Heures sup × taux horaire × majoration",
      value: payslip.overtimePay,
      hint: `Majoration ${store.settings.overtimeRate} (Paramètres).`,
    },
    {
      id: "bonus",
      title: "Prime",
      formula: "Montant saisi sur le cycle",
      value: payslip.bonus,
      hint: "Ajoutée au brut, soumise à cotisations.",
    },
    {
      id: "gross",
      title: "Total brut",
      formula: "Prorata + heures sup + prime",
      value: payslip.gross,
      hint: "Base des cotisations « brut ».",
    },
    {
      id: "csg",
      title: "Base CSG / CRDS",
      formula: "Brut × 98,25 % + part employeur mutuelle",
      value: payslip.lines.find((item) => item.label.startsWith("CSG non"))?.base ?? 0,
      hint: "Abattement 1,75 % pour frais professionnels.",
    },
    {
      id: "employee",
      title: "Cotisations salariales",
      formula: "Somme des retenues (santé, retraite, CSG…)",
      value: payslip.employeeCharges,
      hint: "Le barème se règle dans Paramètres.",
    },
    {
      id: "fillon",
      title: "Allègement Fillon (employeur)",
      formula: "Réduction générale jusqu’à 1,6 SMIC",
      value: payslip.employerRelief,
      hint: "Diminue uniquement la part employeur, pas le net.",
    },
    {
      id: "tickets",
      title: "Indemnités repas",
      formula: "Tickets 5 € et 16,50 € × quantités fiche",
      value: payslip.indemnities.reduce((sum, item) => sum + item.gain, 0),
      hint: "Ajoutées après le net salarial, hors cotisations.",
    },
    {
      id: "advance",
      title: "Acompte déjà versé",
      formula: "Acomptes validés du mois",
      value: payslip.advance,
      hint: "Déduit du net à payer.",
    },
    {
      id: "imposable",
      title: "Net imposable",
      formula: "(Brut − cotis. salariales) + CSG/CRDS imposable",
      value: payslip.netImposable,
      hint: "Base du prélèvement à la source.",
    },
    {
      id: "pas",
      title: "Prélèvement à la source",
      formula: "Net imposable × taux PAS de la fiche",
      value: payslip.pasAmount,
      hint: `Taux fiche : ${(employee.pasRate * 100).toFixed(1)} %.`,
    },
    {
      id: "net",
      title: "Net à payer",
      formula: "Net salarial + indemnités − acompte − PAS",
      value: payslip.net,
      hint: "Montant viré au salarié.",
    },
    {
      id: "cost",
      title: "Coût employeur",
      formula: "Brut + cotisations employeur (après Fillon)",
      value: payslip.employerCost,
      hint: "Ce que l’entreprise dépense vraiment.",
    },
  ];
  res.json({
    employee,
    settings: store.settings,
    payslip,
    steps,
  });
});

payrollRouter.get("/periods", (_req, res) => {
  const { periods } = loadStore();
  res.json([...periods].sort((a, b) => b.year - a.year || b.month - a.month));
});

payrollRouter.post("/periods", (req, res) => {
  const parsed = z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Période invalide" });
    return;
  }
  const created = mutate((store) => {
    const exists = store.periods.some((item) => item.year === parsed.data.year && item.month === parsed.data.month);
    if (exists) return { error: "Cette période existe déjà" as const };
    const period = {
      id: id(),
      year: parsed.data.year,
      month: parsed.data.month,
      status: "draft" as const,
      createdAt: new Date().toISOString(),
    };
    store.periods.push(period);
    return { period };
  });
  if ("error" in created) {
    res.status(409).json({ error: created.error });
    return;
  }
  res.status(201).json(created.period);
});

payrollRouter.get("/periods/:id", (req, res) => {
  const store = loadStore();
  const period = store.periods.find((item) => item.id === req.params.id);
  if (!period) {
    res.status(404).json({ error: "Période introuvable" });
    return;
  }
  const slips = store.payslips.filter((item) => item.periodId === period.id);
  const suggestions = store.employees
    .filter((employee) => employee.status !== "terminated")
    .map((employee) => {
      const leaveDays = store.leaves
        .filter((item) => item.employeeId === employee.id && item.status === "approved")
        .reduce((sum, item) => sum + leaveDaysInMonth(item.startDate, item.endDate, period.year, period.month), 0);
      const advance = store.advances
        .filter(
          (item) =>
            item.employeeId === employee.id &&
            item.status === "approved" &&
            item.year === period.year &&
            item.month === period.month,
        )
        .reduce((sum, item) => sum + item.amount, 0);
      return {
        employeeId: employee.id,
        leaveDays,
        suggestedWorkedDays: Math.max(store.settings.workingDays - leaveDays, 0),
        advance,
        leaveLabel: leaveDays ? `${leaveDays} j d'absence` : null,
      };
    });
  res.json({ period, payslips: slips, suggestions });
});

const entriesSchema = z.object({
  entries: z.array(
    z.object({
      employeeId: z.string(),
      workedDays: z.number().min(0).max(31),
      overtimeHours: z.number().min(0),
      bonus: z.number().min(0),
    }),
  ),
});

payrollRouter.post("/periods/:id/calculate", (req, res) => {
  const parsed = entriesSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Saisie invalide", details: parsed.error.flatten() });
    return;
  }
  const result = mutate((store) => {
    const period = store.periods.find((item) => item.id === req.params.id);
    if (!period) return { error: "Période introuvable", status: 404 as const };
    if (period.status === "paid") return { error: "Période déjà payée", status: 409 as const };

    store.payslips = store.payslips.filter((item) => item.periodId !== period.id);
    const slips = parsed.data.entries
      .map((entry) => {
        const employee = store.employees.find((item) => item.id === entry.employeeId);
        if (!employee || employee.status === "terminated") return null;
        const advance = store.advances
          .filter(
            (item) =>
              item.employeeId === employee.id &&
              item.status === "approved" &&
              item.year === period.year &&
              item.month === period.month,
          )
          .reduce((sum, item) => sum + item.amount, 0);
        const slip = calculatePayslip({
          employee,
          periodId: period.id,
          workedDays: entry.workedDays,
          overtimeHours: entry.overtimeHours,
          bonus: entry.bonus,
          advance,
          workingDays: store.settings.workingDays,
          monthlyHours: store.settings.monthlyHours,
          overtimeRate: store.settings.overtimeRate,
          smicHourly: store.settings.smicHourly,
          fillonT: store.settings.fillonT,
          rates: store.rates,
        });
        notifyEmployee(store, employee.id, {
          title: "Bulletin disponible",
          body: `Votre paie ${String(period.month).padStart(2, "0")}/${period.year} a été calculée.`,
          link: `/espace/bulletins/${slip.id}`,
        });
        return slip;
      })
      .filter((item) => item !== null);

    store.payslips.push(...slips);
    period.status = "calculated";
    period.calculatedAt = new Date().toISOString();
    return { period, payslips: slips };
  });

  if (isActionError(result)) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result);
});

payrollRouter.post("/periods/:id/validate", (req, res) => {
  const result = mutate((store) => {
    const period = store.periods.find((item) => item.id === req.params.id);
    if (!period) return { error: "Période introuvable", status: 404 as const };
    if (period.status !== "calculated") return { error: "Calculez d'abord la paie", status: 409 as const };
    period.status = "validated";
    period.validatedAt = new Date().toISOString();
    return { period };
  });
  if (isActionError(result)) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.period);
});

payrollRouter.post("/periods/:id/pay", (req, res) => {
  const result = mutate((store) => {
    const period = store.periods.find((item) => item.id === req.params.id);
    if (!period) return { error: "Période introuvable", status: 404 as const };
    if (period.status !== "validated") return { error: "Validez d'abord la paie", status: 409 as const };
    period.status = "paid";
    period.paidAt = new Date().toISOString();
    store.advances.forEach((item) => {
      if (item.status === "approved" && item.year === period.year && item.month === period.month) {
        item.status = "settled";
      }
    });
    return { period };
  });
  if (isActionError(result)) {
    res.status(result.status).json({ error: result.error });
    return;
  }
  res.json(result.period);
});

payrollRouter.get("/periods/:id/export", (req, res) => {
  const store = loadStore();
  const period = store.periods.find((item) => item.id === req.params.id);
  if (!period) {
    res.status(404).json({ error: "Période introuvable" });
    return;
  }
  if (period.status === "draft") {
    res.status(409).json({ error: "Calculez la paie avant l'export bancaire" });
    return;
  }
  const slips = store.payslips.filter((item) => item.periodId === period.id);
  const rows = slips.map((slip) => {
    const employee = store.employees.find((item) => item.id === slip.employeeId);
    return {
      name: employee ? `${employee.lastName} ${employee.firstName}` : slip.employeeId,
      iban: employee?.iban ?? "",
      amount: slip.net,
      reference: `PAIE-${period.year}${String(period.month).padStart(2, "0")}-${employee?.lastName ?? ""}`.toUpperCase(),
    };
  });
  res.json({
    filename: `virement-paie-${period.year}-${String(period.month).padStart(2, "0")}.csv`,
    period,
    total: rows.reduce((sum, row) => sum + row.amount, 0),
    rows,
  });
});

payrollRouter.get("/employee/:employeeId/payslips", (req, res) => {
  const store = loadStore();
  const slips = store.payslips.filter((item) => item.employeeId === req.params.employeeId);
  res.json(slips);
});

payrollRouter.get("/payslips/:id", (req, res) => {
  const store = loadStore();
  const payslip = store.payslips.find((item) => item.id === req.params.id);
  if (!payslip) {
    res.status(404).json({ error: "Bulletin introuvable" });
    return;
  }
  const user = getUser(req);
  if (user.role !== "admin" && user.employeeId !== payslip.employeeId) {
    res.status(403).json({ error: "Ce bulletin ne vous appartient pas" });
    return;
  }
  const employee = store.employees.find((item) => item.id === payslip.employeeId);
  const department = store.departments.find((item) => item.id === employee?.departmentId);
  const period = store.periods.find((item) => item.id === payslip.periodId);
  if (!employee || !period) {
    res.status(404).json({ error: "Bulletin incomplet" });
    return;
  }
  const bulletin = bulletinMeta({
    employee,
    period,
    settings: store.settings,
    payslip,
    leaves: store.leaves,
    payslips: store.payslips,
    periods: store.periods,
  });
  res.json({ payslip, employee, department, period, settings: store.settings, bulletin });
});
