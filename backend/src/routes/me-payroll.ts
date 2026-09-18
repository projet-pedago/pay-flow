import { Router } from "express";
import { getUser } from "../auth.js";
import { leaveBalancesFor } from "../lib/leave-balance.js";
import { loadStore } from "../lib/store.js";

export const mePayrollRouter = Router();

mePayrollRouter.get("/payslips", (req, res) => {
  const user = getUser(req);
  if (!user.employeeId) {
    res.json([]);
    return;
  }
  const store = loadStore();
  const slips = store.payslips
    .filter((item) => item.employeeId === user.employeeId && !item.superseded)
    .map((payslip) => ({
      payslip,
      period: store.periods.find((item) => item.id === payslip.periodId),
    }))
    .sort((a, b) => {
      const ay = a.period?.year ?? 0;
      const by = b.period?.year ?? 0;
      return by - ay || (b.period?.month ?? 0) - (a.period?.month ?? 0);
    });
  res.json(slips);
});

mePayrollRouter.get("/summary", (req, res) => {
  const user = getUser(req);
  const store = loadStore();
  if (!user.employeeId) {
    const sortedPeriods = [...store.periods].sort((a, b) => b.year - a.year || b.month - a.month);
    res.json({
      settings: store.settings,
      employee: null,
      department: null,
      currentPeriod: sortedPeriods[0] ?? null,
      lastPayslip: null,
      payslipCount: 0,
      ytdNet: 0,
      leave: null,
      pendingRequests: 0,
    });
    return;
  }
  const employee = store.employees.find((item) => item.id === user.employeeId);
  const department = store.departments.find((item) => item.id === employee?.departmentId);
  const mine = store.payslips.filter((item) => item.employeeId === user.employeeId && !item.superseded);
  const sortedPeriods = [...store.periods].sort((a, b) => b.year - a.year || b.month - a.month);
  const latestSlip = mine
    .map((payslip) => ({
      payslip,
      period: store.periods.find((item) => item.id === payslip.periodId),
    }))
    .sort((a, b) => {
      const ay = a.period?.year ?? 0;
      const by = b.period?.year ?? 0;
      return by - ay || (b.period?.month ?? 0) - (a.period?.month ?? 0);
    })[0];

  const pendingLeaves = store.leaves.filter((item) => item.employeeId === user.employeeId && item.status === "pending").length;
  const pendingAdvances = store.advances.filter((item) => item.employeeId === user.employeeId && item.status === "pending").length;

  res.json({
    settings: store.settings,
    employee,
    department,
    currentPeriod: sortedPeriods[0] ?? null,
    lastPayslip: latestSlip ?? null,
    payslipCount: mine.length,
    ytdNet: mine.reduce((sum, item) => sum + item.net, 0),
    leave: employee ? leaveBalancesFor(store, employee.id) : null,
    pendingRequests: pendingLeaves + pendingAdvances,
  });
});
