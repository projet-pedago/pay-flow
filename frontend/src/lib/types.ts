export type ContractType = "CDI" | "CDD" | "Stage" | "Alternance";
export type EmployeeStatus = "active" | "on_leave" | "terminated";
export type PeriodStatus = "draft" | "calculated" | "validated" | "paid";

export type Department = {
  id: string;
  name: string;
  code: string;
  budget: number;
  color: string;
};

export type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: string;
  jobTitle: string;
  contractType: ContractType;
  hireDate: string;
  baseSalary: number;
  status: EmployeeStatus;
  iban: string;
  city: string;
  country: string;
};

export type EmployeeDraft = Omit<Employee, "id">;

export type ContributionRate = {
  id: string;
  label: string;
  employeeRate: number;
  employerRate: number;
  base: "gross" | "csg";
};

export type PayslipLine = {
  label: string;
  base: number;
  employeeRate: number;
  employerRate: number;
  employeeAmount: number;
  employerAmount: number;
};

export type Payslip = {
  id: string;
  periodId: string;
  employeeId: string;
  workedDays: number;
  overtimeHours: number;
  bonus: number;
  baseSalary: number;
  proratedBase: number;
  overtimePay: number;
  gross: number;
  employeeCharges: number;
  employerCharges: number;
  net: number;
  employerCost: number;
  advance?: number;
  lines: PayslipLine[];
};

export type PayrollPeriod = {
  id: string;
  year: number;
  month: number;
  status: PeriodStatus;
  createdAt: string;
  calculatedAt?: string;
  validatedAt?: string;
  paidAt?: string;
};

export type Settings = {
  companyName: string;
  companyCity: string;
  currency: "EUR" | "XOF";
  workingDays: number;
  monthlyHours: number;
  overtimeRate: number;
};

export type DashboardData = {
  settings: Settings;
  kpis: {
    headcount: number;
    onLeave: number;
    gross: number;
    net: number;
    employerCost: number;
    averageNet: number;
  };
  latestPeriod: PayrollPeriod | null;
  kpiPeriod: PayrollPeriod | null;
  byDepartment: {
    id: string;
    name: string;
    color: string;
    headcount: number;
    payroll: number;
    budget: number;
  }[];
  history: {
    id: string;
    label: string;
    status: PeriodStatus;
    gross: number;
    net: number;
    employerCost: number;
  }[];
  alerts: string[];
  anomalies?: {
    severity: "high" | "medium" | "low";
    title: string;
    detail: string;
    link: string;
  }[];
};

export type LeaveType = "cp" | "rtt" | "maladie" | "sans_solde";
export type RequestStatus = "pending" | "approved" | "rejected" | "settled";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  employeeName?: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: RequestStatus;
  createdAt: string;
};

export type LeaveBalance = {
  employeeId: string;
  name: string;
  cp: { acquired: number; used: number; remaining: number };
  rtt: { acquired: number; used: number; remaining: number };
};

export type SalaryAdvance = {
  id: string;
  employeeId: string;
  employeeName?: string;
  amount: number;
  year: number;
  month: number;
  reason: string;
  status: RequestStatus;
  createdAt: string;
};

export type DocumentPack = {
  employeeId: string;
  name: string;
  complete: boolean;
  missing: number;
  documents: { id: string; key: string; label: string; status: "provided" | "missing" }[];
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
};

export type PeriodSuggestion = {
  employeeId: string;
  leaveDays: number;
  suggestedWorkedDays: number;
  advance: number;
  leaveLabel: string | null;
};
