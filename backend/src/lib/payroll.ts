import { randomUUID } from "node:crypto";
import type { ContributionRate, Employee, Payslip, PayslipLine } from "../types.js";

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

let lineSeq = 0;
function line(partial: Omit<PayslipLine, "id">): PayslipLine {
  lineSeq += 1;
  return { id: `ln-${lineSeq}`, ...partial };
}

export function fillonRelief(gross: number, hours: number, isCadre: boolean, smicHourly: number, fillonT: number): number {
  const T = isCadre ? fillonT + 0.0039 : fillonT;
  const smic = smicHourly * Math.max(hours, 0);
  if (gross <= 0 || smic <= 0) return 0;
  const ceiling = 1.6 * smic;
  if (gross >= ceiling) return 0;
  const coeff = Math.min((T / 0.6) * (ceiling / gross - 1), T);
  return round(coeff * gross);
}

export function calculatePayslip(input: {
  employee: Employee;
  periodId: string;
  workedDays: number;
  overtimeHours: number;
  bonus: number;
  advance?: number;
  workingDays: number;
  monthlyHours: number;
  overtimeRate: number;
  smicHourly?: number;
  fillonT?: number;
  rates: ContributionRate[];
}): Payslip {
  const { employee, periodId, workedDays, overtimeHours, bonus, workingDays, monthlyHours, overtimeRate, rates } =
    input;
  const advance = round(input.advance ?? 0);
  const smicHourly = input.smicHourly ?? 11.88;
  const fillonT = input.fillonT ?? 0.3195;
  const contractHours = employee.contractHours || monthlyHours;
  const ratio = Math.min(Math.max(workedDays / workingDays, 0), 1);
  const hours = round(contractHours * ratio, 3);
  const hourlyRate = round(employee.baseSalary / contractHours, 3);
  const proratedBase = round(hourlyRate * hours);
  const overtimePay = round(overtimeHours * hourlyRate * overtimeRate);
  const safeBonus = round(bonus);
  const gross = round(proratedBase + overtimePay + safeBonus);

  const mutuelleRate = rates.find((rate) => rate.id === "mutuelle" || rate.label.toLowerCase().includes("complémentaire santé"));
  const mutuelleEmployer = mutuelleRate ? round(gross * mutuelleRate.employerRate) : 0;
  const csgBase = round(round(gross * 0.9825, 3) + mutuelleEmployer, 3);

  const contributionLines: PayslipLine[] = [];
  let lastSection: string | undefined;

  for (const rate of rates) {
    if (rate.section && rate.section !== lastSection) {
      contributionLines.push(
        line({
          label: rate.section,
          kind: "header",
          quantity: null,
          base: null,
          employeeRate: null,
          gain: null,
          employeeAmount: null,
          employerAmount: null,
        }),
      );
      lastSection = rate.section;
    }

    const base = rate.base === "csg" ? csgBase : rate.base === "mutuelle" ? mutuelleEmployer : gross;
    const employeeAmount = round(base * rate.employeeRate);
    const employerAmount = round(base * rate.employerRate);
    contributionLines.push(
      line({
        label: rate.label || "Forfait social",
        kind: "contribution",
        quantity: null,
        base: round(base, 3),
        employeeRate: rate.employeeRate,
        gain: null,
        employeeAmount,
        employerAmount,
      }),
    );
  }

  const employeeCharges = round(
    contributionLines.reduce((sum, item) => sum + (item.employeeAmount ?? 0), 0),
  );
  const employerBeforeRelief = round(
    contributionLines.reduce((sum, item) => sum + (item.employerAmount ?? 0), 0),
  );

  const isCadre = employee.category.toLowerCase().includes("cadre") && !employee.category.toLowerCase().includes("non");
  const employerRelief = fillonRelief(gross, hours, isCadre, smicHourly, fillonT);

  if (employerRelief > 0) {
    contributionLines.push(
      line({
        label: "ALLEGEMENT DES COTISATIONS",
        kind: "relief",
        quantity: null,
        base: null,
        employeeRate: null,
        gain: null,
        employeeAmount: 0,
        employerAmount: round(-employerRelief),
      }),
    );
  }

  const employerCharges = round(employerBeforeRelief - employerRelief);
  contributionLines.push(
    line({
      label: "TOTAL DES COTISATIONS ET CONTRIBUTIONS",
      kind: "total",
      quantity: null,
      base: null,
      employeeRate: null,
      gain: null,
      employeeAmount: employeeCharges,
      employerAmount: employerCharges,
    }),
  );

  const ticket5 = employee.mealTicket5 ?? 0;
  const ticket1650 = employee.mealTicket1650 ?? 0;
  const indemnities = [
    ...(ticket5
      ? [{ label: "Indem Repas J 5 €", quantity: ticket5, unitAmount: 5, gain: round(ticket5 * 5) }]
      : []),
    ...(ticket1650
      ? [{ label: "Indem Repas 16.50 €", quantity: ticket1650, unitAmount: 16.5, gain: round(ticket1650 * 16.5) }]
      : []),
  ];
  const indemnityGain = round(indemnities.reduce((sum, item) => sum + item.gain, 0));

  const taxableCsg = contributionLines.find((item) => item.label.startsWith("CSG/CRDS"))?.employeeAmount ?? 0;
  const netSalary = round(gross - employeeCharges);
  const netImposable = round(netSalary + taxableCsg);
  const netBeforePas = round(netSalary + indemnityGain - advance);
  const pasRate = employee.pasRate ?? 0;
  const pasAmount = round(netImposable * pasRate);
  const net = round(netBeforePas - pasAmount);
  const employerCost = round(gross + employerCharges);
  const csgUnimposedMention = round(gross * 0.01475);

  const table: PayslipLine[] = [
    line({
      label: "Salaire horaire",
      kind: "earning",
      quantity: hours,
      base: hourlyRate,
      employeeRate: null,
      gain: proratedBase,
      employeeAmount: null,
      employerAmount: null,
    }),
  ];

  if (overtimeHours > 0) {
    table.push(
      line({
        label: "Heures supplémentaires",
        kind: "earning",
        quantity: overtimeHours,
        base: round(hourlyRate * overtimeRate, 3),
        employeeRate: null,
        gain: overtimePay,
        employeeAmount: null,
        employerAmount: null,
      }),
    );
  }

  if (safeBonus > 0) {
    table.push(
      line({
        label: "Prime",
        kind: "earning",
        quantity: null,
        base: null,
        employeeRate: null,
        gain: safeBonus,
        employeeAmount: null,
        employerAmount: null,
      }),
    );
  }

  table.push(
    line({
      label: "TOTAL BRUT",
      kind: "total",
      quantity: null,
      base: null,
      employeeRate: null,
      gain: gross,
      employeeAmount: null,
      employerAmount: null,
    }),
  );
  table.push(...contributionLines);

  for (const indemnity of indemnities) {
    table.push(
      line({
        label: indemnity.label,
        kind: "indemnity",
        quantity: indemnity.quantity,
        base: indemnity.unitAmount,
        employeeRate: null,
        gain: indemnity.gain,
        employeeAmount: null,
        employerAmount: null,
      }),
    );
  }

  if (advance > 0) {
    table.push(
      line({
        label: "Acompte déjà versé",
        kind: "indemnity",
        quantity: null,
        base: null,
        employeeRate: null,
        gain: null,
        employeeAmount: advance,
        employerAmount: null,
      }),
    );
  }

  return {
    id: randomUUID(),
    periodId,
    employeeId: employee.id,
    workedDays,
    overtimeHours,
    bonus: safeBonus,
    baseSalary: employee.baseSalary,
    proratedBase,
    overtimePay,
    gross,
    employeeCharges,
    employerCharges,
    net,
    employerCost,
    advance,
    hours,
    hourlyRate,
    indemnities,
    netBeforePas,
    pasRate,
    pasAmount,
    netImposable,
    employerRelief,
    csgUnimposedMention,
    lines: table,
  };
}
