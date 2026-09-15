import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_EMPLOYEE_PASSWORD,
} from "../auth-constants.js";
import { hashPassword } from "../auth.js";
import type { AuthUser, Employee, Store } from "../types.js";
import { calculatePayslip } from "./payroll.js";

const rates = [
  { id: "maladie", label: "Assurance maladie", employeeRate: 0, employerRate: 0.07, base: "gross" as const },
  { id: "vieillesse-plaf", label: "Assurance vieillesse plafonnée", employeeRate: 0.069, employerRate: 0.0855, base: "gross" as const },
  { id: "vieillesse", label: "Assurance vieillesse déplafonnée", employeeRate: 0.004, employerRate: 0.019, base: "gross" as const },
  { id: "famille", label: "Allocations familiales", employeeRate: 0, employerRate: 0.0345, base: "gross" as const },
  { id: "at", label: "Accidents du travail", employeeRate: 0, employerRate: 0.012, base: "gross" as const },
  { id: "chomage", label: "Assurance chômage", employeeRate: 0, employerRate: 0.0405, base: "gross" as const },
  { id: "retraite-t1", label: "Retraite complémentaire T1", employeeRate: 0.0315, employerRate: 0.0472, base: "gross" as const },
  { id: "ceg", label: "CEG", employeeRate: 0.0086, employerRate: 0.0129, base: "gross" as const },
  { id: "csg-ded", label: "CSG déductible", employeeRate: 0.068, employerRate: 0, base: "csg" as const },
  { id: "csg-nd", label: "CSG non déductible", employeeRate: 0.024, employerRate: 0, base: "csg" as const },
  { id: "crds", label: "CRDS", employeeRate: 0.005, employerRate: 0, base: "csg" as const },
];

function uid(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

export function createSeed(): Store {
  const departments = [
    { id: uid("dep", 1), name: "Direction générale", code: "DG", budget: 180000, color: "#0f766e" },
    { id: uid("dep", 2), name: "Ressources humaines", code: "RH", budget: 96000, color: "#1d4ed8" },
    { id: uid("dep", 3), name: "Ingénierie", code: "ING", budget: 420000, color: "#7c3aed" },
    { id: uid("dep", 4), name: "Opérations", code: "OPS", budget: 210000, color: "#c2410c" },
    { id: uid("dep", 5), name: "Finance", code: "FIN", budget: 150000, color: "#0f172a" },
  ];

  const employees = [
    {
      id: uid("emp", 1),
      firstName: "Aminata",
      lastName: "Diallo",
      email: "aminata.diallo@payrollflow.demo",
      phone: "+33 6 12 44 81 02",
      departmentId: uid("dep", 1),
      jobTitle: "Directrice générale",
      contractType: "CDI" as const,
      hireDate: "2019-03-01",
      baseSalary: 7200,
      status: "active" as const,
      iban: "FR76 ACCT-000039 7890 123",
      city: "Paris",
      country: "France",
    },
    {
      id: uid("emp", 2),
      firstName: "Jean-Pierre",
      lastName: "Kouamé",
      email: "jp.kouame@payrollflow.demo",
      phone: "+33 6 18 22 09 41",
      departmentId: uid("dep", 3),
      jobTitle: "Lead DevOps",
      contractType: "CDI" as const,
      hireDate: "2021-06-15",
      baseSalary: 5400,
      status: "active" as const,
      iban: "FR76 ACCT-000011 7890 123",
      city: "Lyon",
      country: "France",
    },
    {
      id: uid("emp", 3),
      firstName: "Fatou",
      lastName: "Ndiaye",
      email: "fatou.ndiaye@payrollflow.demo",
      phone: "+33 7 44 12 88 03",
      departmentId: uid("dep", 2),
      jobTitle: "Responsable paie",
      contractType: "CDI" as const,
      hireDate: "2020-01-08",
      baseSalary: 4100,
      status: "active" as const,
      iban: "FR76 ACCT-000033 7890 123",
      city: "Dakar",
      country: "Sénégal",
    },
    {
      id: uid("emp", 4),
      firstName: "Hugo",
      lastName: "Bernard",
      email: "hugo.bernard@payrollflow.demo",
      phone: "+33 6 55 01 19 77",
      departmentId: uid("dep", 3),
      jobTitle: "Ingénieur cloud Azure",
      contractType: "CDI" as const,
      hireDate: "2022-09-12",
      baseSalary: 4600,
      status: "active" as const,
      iban: "FR76 ACCT-000028 7890 123",
      city: "Nantes",
      country: "France",
    },
    {
      id: uid("emp", 5),
      firstName: "Aïcha",
      lastName: "Traoré",
      email: "aicha.traore@payrollflow.demo",
      phone: "+225 07 08 44 21 90",
      departmentId: uid("dep", 4),
      jobTitle: "Cheffe des opérations",
      contractType: "CDI" as const,
      hireDate: "2018-11-04",
      baseSalary: 3900,
      status: "active" as const,
      iban: "CI93 CI008 01111 2222 3333 44",
      city: "Abidjan",
      country: "Côte d'Ivoire",
    },
    {
      id: uid("emp", 6),
      firstName: "Léa",
      lastName: "Moreau",
      email: "lea.moreau@payrollflow.demo",
      phone: "+33 6 77 12 45 08",
      departmentId: uid("dep", 5),
      jobTitle: "Contrôleuse de gestion",
      contractType: "CDI" as const,
      hireDate: "2023-02-20",
      baseSalary: 3600,
      status: "on_leave" as const,
      iban: "FR76 ACCT-000015 7890 123",
      city: "Bordeaux",
      country: "France",
    },
    {
      id: uid("emp", 7),
      firstName: "Omar",
      lastName: "Benali",
      email: "omar.benali@payrollflow.demo",
      phone: "+33 7 11 90 22 54",
      departmentId: uid("dep", 3),
      jobTitle: "Développeur backend",
      contractType: "CDI" as const,
      hireDate: "2024-01-15",
      baseSalary: 3400,
      status: "active" as const,
      iban: "FR76 ACCT-000040 7890 123",
      city: "Marseille",
      country: "France",
    },
    {
      id: uid("emp", 8),
      firstName: "Camille",
      lastName: "Roux",
      email: "camille.roux@payrollflow.demo",
      phone: "+33 6 02 88 41 17",
      departmentId: uid("dep", 2),
      jobTitle: "Chargée RH",
      contractType: "CDD" as const,
      hireDate: "2025-03-01",
      baseSalary: 2800,
      status: "active" as const,
      iban: "FR76 ACCT-000035 7890 123",
      city: "Lille",
      country: "France",
    },
    {
      id: uid("emp", 9),
      firstName: "Kwame",
      lastName: "Mensah",
      email: "kwame.mensah@payrollflow.demo",
      phone: "+233 24 555 0192",
      departmentId: uid("dep", 3),
      jobTitle: "Ingénieur frontend",
      contractType: "CDI" as const,
      hireDate: "2023-07-10",
      baseSalary: 3700,
      status: "active" as const,
      iban: "GH20 GH001 0000 1111 222",
      city: "Accra",
      country: "Ghana",
    },
    {
      id: uid("emp", 10),
      firstName: "Sofia",
      lastName: "Martins",
      email: "sofia.martins@payrollflow.demo",
      phone: "+33 6 41 77 03 29",
      departmentId: uid("dep", 5),
      jobTitle: "Comptable paie",
      contractType: "CDI" as const,
      hireDate: "2021-04-19",
      baseSalary: 3100,
      status: "active" as const,
      iban: "FR76 ACCT-000012 7890 123",
      city: "Toulouse",
      country: "France",
    },
    {
      id: uid("emp", 11),
      firstName: "Yanis",
      lastName: "Haddad",
      email: "yanis.haddad@payrollflow.demo",
      phone: "+33 7 33 10 64 82",
      departmentId: uid("dep", 4),
      jobTitle: "Coordinateur logistique",
      contractType: "CDI" as const,
      hireDate: "2022-01-03",
      baseSalary: 2950,
      status: "active" as const,
      iban: "FR76 ACCT-000007 7890 123",
      city: "Strasbourg",
      country: "France",
    },
    {
      id: uid("emp", 12),
      firstName: "Inès",
      lastName: "Petit",
      email: "ines.petit@payrollflow.demo",
      phone: "+33 6 90 14 55 61",
      departmentId: uid("dep", 3),
      jobTitle: "Apprentie QA",
      contractType: "Alternance" as const,
      hireDate: "2025-09-01",
      baseSalary: 1450,
      status: "active" as const,
      iban: "FR76 ACCT-000041 7890 123",
      city: "Rennes",
      country: "France",
    },
  ];

  const settings = {
    companyName: "Horizon Afrique Consulting",
    companyCity: "Paris / Abidjan",
    currency: "EUR" as const,
    workingDays: 22,
    monthlyHours: 151.67,
    overtimeRate: 1.25,
  };

  const extras: Record<string, { overtimeHours: number; bonus: number; workedDays: number }> = {
    [uid("emp", 2)]: { overtimeHours: 8, bonus: 400, workedDays: 22 },
    [uid("emp", 4)]: { overtimeHours: 6, bonus: 200, workedDays: 22 },
    [uid("emp", 6)]: { overtimeHours: 0, bonus: 0, workedDays: 12 },
    [uid("emp", 7)]: { overtimeHours: 10, bonus: 150, workedDays: 22 },
    [uid("emp", 12)]: { overtimeHours: 0, bonus: 0, workedDays: 22 },
  };

  const periods = [
    { id: uid("per", 1), year: 2026, month: 7, status: "paid" as const, createdAt: "2026-07-28T09:00:00.000Z", calculatedAt: "2026-07-29T10:00:00.000Z", validatedAt: "2026-07-30T14:00:00.000Z", paidAt: "2026-07-31T08:00:00.000Z" },
    { id: uid("per", 2), year: 2026, month: 8, status: "validated" as const, createdAt: "2026-08-27T09:00:00.000Z", calculatedAt: "2026-08-28T11:00:00.000Z", validatedAt: "2026-08-29T16:00:00.000Z" },
    { id: uid("per", 3), year: 2026, month: 9, status: "draft" as const, createdAt: "2026-09-10T09:00:00.000Z" },
  ];

  const payslips = periods.flatMap((period) => {
    if (period.status === "draft") return [];
    return employees.map((employee) => {
        const extra = extras[employee.id] ?? { overtimeHours: 2, bonus: 0, workedDays: 22 };
        return calculatePayslip({
          employee,
          periodId: period.id,
          workedDays: extra.workedDays,
          overtimeHours: extra.overtimeHours,
          bonus: extra.bonus,
          workingDays: settings.workingDays,
          monthlyHours: settings.monthlyHours,
          overtimeRate: settings.overtimeRate,
          rates,
        });
      });
  });

  return {
    settings,
    departments,
    employees,
    rates,
    periods,
    payslips,
    users: buildUsers(employees),
    leaves: buildLeaves(),
    advances: buildAdvances(),
    documents: buildDocuments(employees),
    notifications: [
      {
        id: "not-001",
        userId: "usr-admin",
        title: "Demande de RTT à valider",
        body: "Omar Benali a posé 3 jours du 18 au 22 septembre.",
        link: "/admin/conges",
        read: false,
        createdAt: "2026-09-12T14:05:00.000Z",
      },
      {
        id: "not-002",
        userId: "usr-admin",
        title: "Acompte en attente",
        body: "Jean-Pierre Kouamé demande 800 € d'acompte.",
        link: "/admin/acomptes",
        read: false,
        createdAt: "2026-09-14T11:05:00.000Z",
      },
      {
        id: "not-003",
        userId: "usr-001",
        title: "Acompte accepté",
        body: "Votre acompte de 500 € a été validé. Il sera déduit du bulletin de septembre.",
        link: "/espace/acomptes",
        read: false,
        createdAt: "2026-09-05T16:05:00.000Z",
      },
    ],
  };
}

function buildLeaves() {
  return [
    {
      id: "leave-001",
      employeeId: uid("emp", 6),
      type: "cp" as const,
      startDate: "2026-09-01",
      endDate: "2026-09-12",
      days: 10,
      reason: "Congés d'été reportés",
      status: "approved" as const,
      createdAt: "2026-08-20T09:00:00.000Z",
      decidedAt: "2026-08-21T10:00:00.000Z",
    },
    {
      id: "leave-002",
      employeeId: uid("emp", 7),
      type: "rtt" as const,
      startDate: "2026-09-18",
      endDate: "2026-09-22",
      days: 3,
      reason: "Pont personnel",
      status: "pending" as const,
      createdAt: "2026-09-12T14:00:00.000Z",
    },
    {
      id: "leave-003",
      employeeId: uid("emp", 3),
      type: "cp" as const,
      startDate: "2026-10-05",
      endDate: "2026-10-09",
      days: 5,
      reason: "Semaine de congés",
      status: "approved" as const,
      createdAt: "2026-09-01T08:00:00.000Z",
      decidedAt: "2026-09-02T09:00:00.000Z",
    },
  ];
}

function buildAdvances() {
  return [
    {
      id: "adv-001",
      employeeId: uid("emp", 1),
      amount: 500,
      year: 2026,
      month: 9,
      reason: "Frais de rentrée",
      status: "approved" as const,
      createdAt: "2026-09-05T10:00:00.000Z",
      decidedAt: "2026-09-05T16:00:00.000Z",
    },
    {
      id: "adv-002",
      employeeId: uid("emp", 2),
      amount: 800,
      year: 2026,
      month: 9,
      reason: "Avance exceptionnelle",
      status: "pending" as const,
      createdAt: "2026-09-14T11:00:00.000Z",
    },
  ];
}

function buildDocuments(employees: Employee[]) {
  const catalog = [
    { key: "cni" as const, label: "Pièce d'identité" },
    { key: "rib" as const, label: "RIB / IBAN" },
    { key: "contrat" as const, label: "Contrat de travail" },
    { key: "vitale" as const, label: "Carte Vitale / CNAM" },
  ];
  return employees.flatMap((employee) =>
    catalog.map((doc) => {
      const missing =
        (employee.id === uid("emp", 12) && doc.key === "contrat") ||
        (employee.id === uid("emp", 6) && doc.key === "vitale");
      return {
        id: `${employee.id}-${doc.key}`,
        employeeId: employee.id,
        key: doc.key,
        label: doc.label,
        status: missing ? ("missing" as const) : ("provided" as const),
        updatedAt: "2026-09-01T08:00:00.000Z",
      };
    }),
  );
}

export function buildUsers(employees: Employee[]): AuthUser[] {
  const employeeHash = hashPassword(DEMO_EMPLOYEE_PASSWORD);
  const users: AuthUser[] = [
    {
      id: "usr-admin",
      email: DEMO_ADMIN_EMAIL,
      passwordHash: hashPassword(DEMO_ADMIN_PASSWORD),
      role: "admin",
      name: "Nadia Koné",
    },
  ];
  employees.forEach((employee, index) => {
    users.push({
      id: `usr-${String(index + 1).padStart(3, "0")}`,
      email: employee.email,
      passwordHash: employeeHash,
      role: "employee",
      name: `${employee.firstName} ${employee.lastName}`,
      employeeId: employee.id,
    });
  });
  return users;
}
