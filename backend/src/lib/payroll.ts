import type { ContributionRate, Employee, Payslip } from "../types.js";
import { id } from "./store.js";

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePayslip(input: {
  employee: Employee;
  periodId: string;
  workedDays: number;
  overtimeHours: number;
  bonus: number;
  workingDays: number;
  monthlyHours: number;
  overtimeRate: number;
  rates: ContributionRate[];
}): Payslip {
  const { employee, periodId, workedDays, overtimeHours, bonus, workingDays, monthlyHours, overtimeRate, rates } =
    input;

  const ratio = Math.min(Math.max(workedDays / workingDays, 0), 1);
  const proratedBase = round(employee.baseSalary * ratio);
  const hourly = employee.baseSalary / monthlyHours;
  const overtimePay = round(overtimeHours * hourly * overtimeRate);
  const safeBonus = round(bonus);
  const gross = round(proratedBase + overtimePay + safeBonus);
  const csgBase = round(gross * 0.9825);

  const lines = rates.map((rate) => {
    const base = rate.base === "csg" ? csgBase : gross;
    return {
      label: rate.label,
      base,
      employeeRate: rate.employeeRate,
      employerRate: rate.employerRate,
      employeeAmount: round(base * rate.employeeRate),
      employerAmount: round(base * rate.employerRate),
    };
  });

  const employeeCharges = round(lines.reduce((sum, line) => sum + line.employeeAmount, 0));
  const employerCharges = round(lines.reduce((sum, line) => sum + line.employerAmount, 0));
  const net = round(gross - employeeCharges);
  const employerCost = round(gross + employerCharges);

  return {
    id: id(),
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
    lines,
  };
}
