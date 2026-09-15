export function countWeekdays(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const weekday = cursor.getDay();
    if (weekday !== 0 && weekday !== 6) days += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

export function leaveDaysInMonth(
  startDate: string,
  endDate: string,
  year: number,
  month: number,
): number {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);
  const from = start > monthStart ? start : monthStart;
  const to = end < monthEnd ? end : monthEnd;
  if (to < from) return 0;
  return countWeekdays(from.toISOString().slice(0, 10), to.toISOString().slice(0, 10));
}

export const LEAVE_LABELS: Record<string, string> = {
  cp: "Congés payés",
  rtt: "RTT",
  maladie: "Maladie",
  sans_solde: "Sans solde",
};
