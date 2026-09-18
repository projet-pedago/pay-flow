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
  entraProvisioningStatus?: "pending" | "provisioned" | "failed" | "skipped";
  entraProvisioningError?: string;
};

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

export type AuditEvent = {
  id: string;
  at: string;
  actorEmail: string;
  action: string;
  detail: string;
  link?: string;
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
  clients: NetworkClient[];
  partners: NetworkPartner[];
  invoices: NetworkInvoice[];
  auditLog: AuditEvent[];
};

export type NetworkClientKind = "internal" | "external";
export type NetworkPartnerKind =
  | "internal"
  | "internal_client"
  | "freelance"
  | "auto_entrepreneur"
  | "contractor"
  | "temp"
  | "portage"
  | "intern";
export type InvoiceDirection = "receivable" | "payable";
export type InvoiceStatus = "draft" | "sent" | "paid";

export type NetworkClient = {
  id: string;
  kind: NetworkClientKind;
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
  direction: InvoiceDirection;
  clientId: string;
  partnerId?: string;
  number: string;
  date: string;
  label: string;
  amountHt: number;
  vatRate: number;
  status: InvoiceStatus;
  createdAt: string;
};
