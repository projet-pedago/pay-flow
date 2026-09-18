export type ContractType = "CDI" | "CDD" | "Stage" | "Alternance";
export type EmployeeStatus = "active" | "on_leave" | "terminated";
export type PeriodStatus = "draft" | "calculated" | "validated" | "paid";
export type Civility = "M" | "Mme";
export type ContributionBase = "gross" | "csg" | "mutuelle";
export type PayslipLineKind = "header" | "earning" | "contribution" | "total" | "indemnity" | "relief";

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
  civility: Civility;
  matricule: string;
  address: string;
  postalCode: string;
  socialSecurityNumber: string;
  category: string;
  coefficient: string;
  classificationIndex: string;
  qualification: string;
  contractHours: number;
  pasRate: number;
  mealTicket5: number;
  mealTicket1650: number;
  contractEndDate?: string;
  entraObjectId?: string;
  entraUserPrincipalName?: string;
  directoryRole?: "admin" | "hr" | "employee";
};

export type EmployeeDraft = Omit<Employee, "id">;

export type ContributionRate = {
  id: string;
  label: string;
  employeeRate: number;
  employerRate: number;
  base: ContributionBase;
  section?: string;
};

export type PayslipLine = {
  id: string;
  label: string;
  kind: PayslipLineKind;
  quantity: number | null;
  base: number | null;
  employeeRate: number | null;
  gain: number | null;
  employeeAmount: number | null;
  employerAmount: number | null;
};

export type PayslipIndemnity = {
  label: string;
  quantity: number;
  unitAmount: number;
  gain: number;
};

export type LeaveCounter = {
  taken: number;
  remaining: number;
  acquired: number;
};

export type CumulRow = {
  gross: number;
  employeeCharges: number;
  employerCharges: number;
  benefitsInKind: number;
  netImposable: number;
  hours: number;
  overtimeHours: number;
  overtimeExempt: number;
};

export type BulletinMeta = {
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  paymentMethod: string;
  seniority: string;
  hireDate: string;
  leaveBalance: LeaveCounter;
  leaveDates: { from: string; to: string }[];
  cumuls: { period: CumulRow; year: CumulRow };
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
  hours: number;
  hourlyRate: number;
  indemnities: PayslipIndemnity[];
  netBeforePas: number;
  pasRate: number;
  pasAmount: number;
  netImposable: number;
  employerRelief: number;
  csgUnimposedMention: number;
  lines: PayslipLine[];
  version?: number;
  superseded?: boolean;
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
  companyAddress: string;
  companyPostalCode: string;
  companyCity: string;
  siret: string;
  ape: string;
  conventionCollective: string;
  paymentMethod: string;
  currency: "EUR" | "XOF";
  workingDays: number;
  monthlyHours: number;
  overtimeRate: number;
  smicHourly: number;
  fillonT: number;
  advanceCapRatio: number;
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
    averageCost: number;
    absenteeismRate: number;
    pendingValidations: number;
    contractsExpiring: number;
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
  gender: { women: number; men: number };
  contracts: { type: ContractType; count: number }[];
  forecast: { label: string; employerCost: number }[];
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
  decidedAt?: string;
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
  decidedAt?: string;
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

export type NetworkPartnerKind =
  | "internal"
  | "internal_client"
  | "freelance"
  | "auto_entrepreneur"
  | "contractor"
  | "temp"
  | "portage"
  | "intern";

export type NetworkClient = {
  id: string;
  kind: "internal" | "external";
  name: string;
  siret: string;
  city: string;
  contact: string;
  email: string;
  website?: string;
  notes: string;
};

export type NetworkPartner = {
  id: string;
  kind: NetworkPartnerKind;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  employeeId?: string;
  clientId?: string;
  companyName: string;
  dailyRate: number;
  vatRate: number;
  status: "active" | "ended";
  notes: string;
  createdAt: string;
};

export type NetworkInvoice = {
  id: string;
  direction: "receivable" | "payable";
  clientId: string;
  partnerId?: string;
  number: string;
  date: string;
  label: string;
  amountHt: number;
  vatRate: number;
  status: "draft" | "sent" | "paid";
  createdAt: string;
};

export type PartnerCatalogItem = {
  kind: NetworkPartnerKind;
  label: string;
  payroll: string;
  billing: string;
  summary: string;
};

export type NetworkPayload = {
  clients: NetworkClient[];
  partners: NetworkPartner[];
  invoices: NetworkInvoice[];
  employees: { id: string; name: string; jobTitle: string }[];
  summary: {
    partners: number;
    activePartners: number;
    clients: number;
    invoices: number;
    billedHt: number;
    billedTtc: number;
    costsHt: number;
    costsTtc: number;
    outstanding: number;
  };
  catalog: PartnerCatalogItem[];
};

export type CalcStep = {
  id: string;
  title: string;
  formula: string;
  value: number;
  hint: string;
};

export type PayslipPreview = {
  employee: Employee;
  settings: Settings;
  payslip: Payslip;
  baseline: Payslip;
  steps: CalcStep[];
  delta: { gross: number; net: number; employerCost: number; employeeCharges: number };
};

export type AssistantReply = {
  answer: string;
  citations: { title: string; link: string }[];
  suggestions: string[];
};

export type Attestation = {
  kind: "travail" | "salaire";
  title: string;
  issuedAt: string;
  company: Settings;
  employee: Employee;
  departmentName: string;
  lastPayslip?: { periodLabel: string; gross: number; net: number; employerCost: number };
};
