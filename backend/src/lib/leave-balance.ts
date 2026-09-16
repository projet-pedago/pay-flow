import type { LeaveType, Store } from "../types.js";

export const ACQUIRED_LEAVE: Record<"cp" | "rtt", number> = { cp: 25, rtt: 10 };

export function leaveRemaining(store: Store, employeeId: string, type: LeaveType, exceptId?: string): number {
  if (type !== "cp" && type !== "rtt") return Number.POSITIVE_INFINITY;
  const used = store.leaves
    .filter(
      (item) =>
        item.id !== exceptId &&
        item.employeeId === employeeId &&
        item.type === type &&
        (item.status === "approved" || item.status === "pending"),
    )
    .reduce((sum, item) => sum + item.days, 0);
  return ACQUIRED_LEAVE[type] - used;
}

export function leaveBalancesFor(store: Store, employeeId: string) {
  const approved = store.leaves.filter((item) => item.employeeId === employeeId && item.status === "approved");
  const usedCp = approved.filter((item) => item.type === "cp").reduce((sum, item) => sum + item.days, 0);
  const usedRtt = approved.filter((item) => item.type === "rtt").reduce((sum, item) => sum + item.days, 0);
  return {
    cp: { acquired: ACQUIRED_LEAVE.cp, used: usedCp, remaining: ACQUIRED_LEAVE.cp - usedCp },
    rtt: { acquired: ACQUIRED_LEAVE.rtt, used: usedRtt, remaining: ACQUIRED_LEAVE.rtt - usedRtt },
  };
}
