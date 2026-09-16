import type { Store } from "../types.js";

export function lastNetPay(store: Store, employeeId: string): number {
  const ranked = store.payslips
    .filter((item) => item.employeeId === employeeId)
    .map((slip) => {
      const period = store.periods.find((item) => item.id === slip.periodId);
      return { net: slip.net, sort: period ? period.year * 100 + period.month : 0 };
    })
    .sort((a, b) => b.sort - a.sort);
  if (ranked[0]) return ranked[0].net;
  return store.employees.find((item) => item.id === employeeId)?.baseSalary ?? 0;
}

export function advanceQuota(store: Store, employeeId: string, year: number, month: number) {
  const ratio = store.settings.advanceCapRatio ?? 0.3;
  const reference = lastNetPay(store, employeeId);
  const cap = Math.round(reference * ratio * 100) / 100;
  const used = store.advances
    .filter(
      (item) =>
        item.employeeId === employeeId &&
        item.year === year &&
        item.month === month &&
        (item.status === "pending" || item.status === "approved" || item.status === "settled"),
    )
    .reduce((sum, item) => sum + item.amount, 0);
  const remaining = Math.max(0, Math.round((cap - used) * 100) / 100);
  return { ratio, reference, cap, used, remaining, year, month };
}
