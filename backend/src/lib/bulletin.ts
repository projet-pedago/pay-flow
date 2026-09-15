import type { CumulRow, Employee, LeaveCounter, LeaveRequest, Payslip, PayrollPeriod, Settings } from "../types.js";

export function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

export function formatFrDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export function periodRange(year: number, month: number): { start: Date; end: Date } {
  return { start: new Date(year, month - 1, 1), end: lastDayOfMonth(year, month) };
}

export function seniorityLabel(hireDate: string, at: Date): string {
  const hire = new Date(`${hireDate}T00:00:00`);
  if (Number.isNaN(hire.getTime())) return "—";
  let years = at.getFullYear() - hire.getFullYear();
  let months = at.getMonth() - hire.getMonth();
  if (at.getDate() < hire.getDate()) months -= 1;
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return "0 an(s) et 0 mois";
  return `${years} an(s) et ${months} mois`;
}

export function paymentDate(period: PayrollPeriod): Date {
  if (period.paidAt) return new Date(period.paidAt);
  return lastDayOfMonth(period.year, period.month);
}

export function leaveBalance(leaves: LeaveRequest[], employeeId: string, year: number): LeaveCounter {
  const mine = leaves.filter((item) => item.employeeId === employeeId && item.status === "approved" && item.type === "cp");
  const taken = mine
    .filter((item) => new Date(item.startDate).getFullYear() === year)
    .reduce((sum, item) => sum + item.days, 0);
  return {
    taken,
    acquired: 0,
    remaining: 0,
  };
}

export function leaveDatesInPeriod(
  leaves: LeaveRequest[],
  employeeId: string,
  year: number,
  month: number,
): { from: string; to: string }[] {
  const { start, end } = periodRange(year, month);
  return leaves
    .filter((item) => item.employeeId === employeeId && item.status === "approved")
    .map((item) => {
      const from = new Date(`${item.startDate}T00:00:00`);
      const to = new Date(`${item.endDate}T00:00:00`);
      return { from, to };
    })
    .filter((item) => item.from <= end && item.to >= start)
    .map((item) => ({
      from: formatFrDate(item.from < start ? start : item.from),
      to: formatFrDate(item.to > end ? end : item.to),
    }));
}

export function cumulFromPayslip(payslip: Payslip): CumulRow {
  return {
    gross: payslip.gross,
    employeeCharges: payslip.employeeCharges,
    employerCharges: payslip.employerCharges,
    benefitsInKind: 0,
    netImposable: payslip.netImposable ?? 0,
    hours: payslip.hours ?? 0,
    overtimeHours: payslip.overtimeHours,
    overtimeExempt: 0,
  };
}

export function addCumul(a: CumulRow, b: CumulRow): CumulRow {
  return {
    gross: round2(a.gross + b.gross),
    employeeCharges: round2(a.employeeCharges + b.employeeCharges),
    employerCharges: round2(a.employerCharges + b.employerCharges),
    benefitsInKind: round2(a.benefitsInKind + b.benefitsInKind),
    netImposable: round2(a.netImposable + b.netImposable),
    hours: round2(a.hours + b.hours),
    overtimeHours: round2(a.overtimeHours + b.overtimeHours),
    overtimeExempt: round2(a.overtimeExempt + b.overtimeExempt),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function yearCumuls(
  payslips: Payslip[],
  periods: PayrollPeriod[],
  employeeId: string,
  year: number,
  current: Payslip,
): { period: CumulRow; year: CumulRow } {
  const periodIds = new Set(periods.filter((item) => item.year === year).map((item) => item.id));
  const yearSlips = payslips.filter((item) => item.employeeId === employeeId && periodIds.has(item.periodId));
  const period = cumulFromPayslip(current);
  const yearRow = yearSlips.reduce((sum, item) => addCumul(sum, cumulFromPayslip(item)), {
    gross: 0,
    employeeCharges: 0,
    employerCharges: 0,
    benefitsInKind: 0,
    netImposable: 0,
    hours: 0,
    overtimeHours: 0,
    overtimeExempt: 0,
  });
  return { period, year: yearRow };
}

export function bulletinMeta(input: {
  employee: Employee;
  period: PayrollPeriod;
  settings: Settings;
  payslip: Payslip;
  leaves: LeaveRequest[];
  payslips: Payslip[];
  periods: PayrollPeriod[];
}) {
  const { start, end } = periodRange(input.period.year, input.period.month);
  const paid = paymentDate(input.period);
  return {
    periodStart: formatFrDate(start),
    periodEnd: formatFrDate(end),
    paymentDate: formatFrDate(paid),
    paymentMethod: input.settings.paymentMethod,
    seniority: seniorityLabel(input.employee.hireDate, end),
    hireDate: formatFrDate(new Date(`${input.employee.hireDate}T00:00:00`)),
    leaveBalance: leaveBalance(input.leaves, input.employee.id, input.period.year),
    leaveDates: leaveDatesInPeriod(input.leaves, input.employee.id, input.period.year, input.period.month),
    cumuls: yearCumuls(input.payslips, input.periods, input.employee.id, input.period.year, input.payslip),
  };
}
