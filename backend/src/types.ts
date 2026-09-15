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

export type Store = {
  settings: Settings;
  departments: Department[];
  employees: Employee[];
  rates: ContributionRate[];
  periods: PayrollPeriod[];
  payslips: Payslip[];
};
