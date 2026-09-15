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
  advance: number;
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

export type Role = "admin" | "employee";

export type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  role: Role;
  name: string;
  employeeId?: string;
};

export type LeaveType = "cp" | "rtt" | "maladie" | "sans_solde";
export type RequestStatus = "pending" | "approved" | "rejected" | "settled";
export type DocumentKey = "cni" | "rib" | "contrat" | "vitale";

export type LeaveRequest = {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt?: string;
};

export type SalaryAdvance = {
  id: string;
  employeeId: string;
  amount: number;
  year: number;
  month: number;
  reason: string;
  status: RequestStatus;
  createdAt: string;
  decidedAt?: string;
};

export type HrDocument = {
  id: string;
  employeeId: string;
  key: DocumentKey;
  label: string;
  status: "provided" | "missing";
  updatedAt: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
};

export type Store = {
  settings: Settings;
  departments: Department[];
  employees: Employee[];
  rates: ContributionRate[];
  periods: PayrollPeriod[];
  payslips: Payslip[];
  users: AuthUser[];
  leaves: LeaveRequest[];
  advances: SalaryAdvance[];
  documents: HrDocument[];
  notifications: AppNotification[];
};
