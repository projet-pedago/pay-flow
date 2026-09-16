import type { Employee, Payslip, Settings } from "../types.js";

export type CalcStep = {
  id: string;
  title: string;
  formula: string;
  value: number;
  hint: string;
};

export function buildCalcSteps(input: {
  employee: Employee;
  settings: Settings;
  payslip: Payslip;
  workedDays: number;
}): CalcStep[] {
  const { employee, settings, payslip, workedDays } = input;
  const ratio = Math.min(Math.max(workedDays / settings.workingDays, 0), 1);
  return [
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
      hint: `${workedDays} j / ${settings.workingDays} j = ${(ratio * 100).toFixed(1)} %.`,
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
      hint: `Majoration ${settings.overtimeRate} (Paramètres).`,
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
      formula: "Net salarial + CSG/CRDS imposable",
      value: payslip.netImposable,
      hint: "Base du prélèvement à la source.",
    },
    {
      id: "pas",
      title: "Prélèvement à la source",
      formula: "Net imposable × taux PAS",
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
}
