import {
  DEMO_ADMIN_EMAIL,
  DEMO_ADMIN_PASSWORD,
  DEMO_EMPLOYEE_PASSWORD,
} from "../auth-constants.js";
import { hashPassword } from "../auth.js";
import type { AuthUser, Civility, Employee, Store } from "../types.js";
import { calculatePayslip } from "./payroll.js";

const rates = [
  { id: "maladie", label: "Sécurité Sociale - Maladie Maternité Invalidité Décès", section: "SANTE", employeeRate: 0, employerRate: 0.13, base: "gross" as const },
  { id: "mutuelle", label: "Complémentaire Santé", section: "SANTE", employeeRate: 0.00325, employerRate: 0.00325, base: "gross" as const },
  { id: "at", label: "ACCIDENTS DE TRAVAIL-MALADIES PROFESSIONNELLES", employeeRate: 0, employerRate: 0.007, base: "gross" as const },
  { id: "vieillesse-plaf", label: "Sécurité Sociale plafonnée", section: "RETRAITE", employeeRate: 0.069, employerRate: 0.0855, base: "gross" as const },
  { id: "vieillesse", label: "Sécurité Sociale déplafonnée", section: "RETRAITE", employeeRate: 0.004, employerRate: 0.0211, base: "gross" as const },
  { id: "retraite-t1", label: "Complémentaire Tranche 1", section: "RETRAITE", employeeRate: 0.0401, employerRate: 0.0601, base: "gross" as const },
  { id: "famille", label: "FAMILLE-SECURITE SOCIALE", employeeRate: 0, employerRate: 0.0525, base: "gross" as const },
  { id: "chomage", label: "ASSURANCE CHOMAGE", employeeRate: 0, employerRate: 0.0425, base: "gross" as const },
  { id: "autres", label: "AUTRES CONTRIBUTIONS DUES PAR L'EMPLOYEUR", employeeRate: 0, employerRate: 0.07693, base: "gross" as const },
  { id: "forfait-social", label: "Forfait social", employeeRate: 0, employerRate: 0.08, base: "mutuelle" as const },
  { id: "csg-non-imp", label: "CSG non imposable à l'impôt sur le revenu", employeeRate: 0.068, employerRate: 0, base: "csg" as const },
  { id: "csg-imp", label: "CSG/CRDS imposable à l'impôt sur le revenu", employeeRate: 0.029, employerRate: 0, base: "csg" as const },
];

function uid(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

function staff(
  n: number,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    departmentId: string;
    jobTitle: string;
    contractType: Employee["contractType"];
    hireDate: string;
    baseSalary: number;
    status: Employee["status"];
    iban: string;
    city: string;
    country?: string;
    civility?: Civility;
    matricule?: string;
    address?: string;
    postalCode?: string;
    socialSecurityNumber?: string;
    category?: string;
    coefficient?: string;
    classificationIndex?: string;
    qualification?: string;
    contractHours?: number;
    pasRate?: number;
    mealTicket5?: number;
    mealTicket1650?: number;
  },
): Employee {
  const cadre = /directeur|directrice|lead|responsable|chef/i.test(data.jobTitle);
  return {
    country: "France",
    ...data,
    id: uid("emp", n),
    civility: data.civility ?? (["Aminata", "Fatou", "Aïcha", "Léa", "Camille", "Sofia", "Inès"].includes(data.firstName) ? "Mme" : "M"),
    matricule: data.matricule ?? String(1000 + n),
    address: data.address ?? `${10 + n} RUE DE LA REPUBLIQUE`,
    postalCode: data.postalCode ?? "75001",
    socialSecurityNumber: data.socialSecurityNumber ?? `1 90 01 75 ${String(100 + n).padStart(3, "0")} ${String(n).padStart(3, "0")} 12`,
    category: data.category ?? (cadre ? "Cadre" : "Non Cadre"),
    coefficient: data.coefficient ?? (cadre ? "400" : "220"),
    classificationIndex: data.classificationIndex ?? (cadre ? "3.1" : "1.3.1"),
    qualification: data.qualification ?? "",
    contractHours: data.contractHours ?? 151.67,
    pasRate: data.pasRate ?? 0,
    mealTicket5: data.mealTicket5 ?? 8,
    mealTicket1650: data.mealTicket1650 ?? 0,
  };
}

export function createSeed(): Store {
  const departments = [
    { id: uid("dep", 1), name: "Direction générale", code: "DG", budget: 180000, color: "#0f766e" },
    { id: uid("dep", 2), name: "Ressources humaines", code: "RH", budget: 96000, color: "#1d4ed8" },
    { id: uid("dep", 3), name: "Ingénierie", code: "ING", budget: 420000, color: "#7c3aed" },
    { id: uid("dep", 4), name: "Opérations", code: "OPS", budget: 210000, color: "#c2410c" },
    { id: uid("dep", 5), name: "Finance", code: "FIN", budget: 150000, color: "#0f172a" },
    { id: uid("dep", 6), name: "CDP TRANSFERT", code: "CDP", budget: 72000, color: "#475569" },
  ];

  const employees = [
    staff(1, { firstName: "Aminata", lastName: "Diallo", email: "aminata.diallo@payrollflow.demo", phone: "+33 6 12 44 81 02", departmentId: uid("dep", 1), jobTitle: "Directrice générale", contractType: "CDI", hireDate: "2019-03-01", baseSalary: 7200, status: "active", iban: "FR76 ACCT-000039 7890 123", city: "Paris", address: "18 AVENUE DE L OPERA", postalCode: "75001", mealTicket5: 0 }),
    staff(2, { firstName: "Jean-Pierre", lastName: "Kouamé", email: "jp.kouame@payrollflow.demo", phone: "+33 6 18 22 09 41", departmentId: uid("dep", 3), jobTitle: "Lead DevOps", contractType: "CDI", hireDate: "2021-06-15", baseSalary: 5400, status: "active", iban: "FR76 ACCT-000011 7890 123", city: "Lyon", address: "4 RUE DE LA REPUBLIQUE", postalCode: "69001" }),
    staff(3, { firstName: "Fatou", lastName: "Ndiaye", email: "fatou.ndiaye@payrollflow.demo", phone: "+33 7 44 12 88 03", departmentId: uid("dep", 2), jobTitle: "Responsable paie", contractType: "CDI", hireDate: "2020-01-08", baseSalary: 4100, status: "active", iban: "FR76 ACCT-000033 7890 123", city: "Paris", address: "9 RUE DES MARTYRS", postalCode: "75009" }),
    staff(4, { firstName: "Hugo", lastName: "Bernard", email: "hugo.bernard@payrollflow.demo", phone: "+33 6 55 01 19 77", departmentId: uid("dep", 3), jobTitle: "Ingénieur cloud Azure", contractType: "CDI", hireDate: "2022-09-12", baseSalary: 4600, status: "active", iban: "FR76 ACCT-000028 7890 123", city: "Nantes", address: "21 RUE CREBILLON", postalCode: "44000" }),
    staff(5, { firstName: "Aïcha", lastName: "Traoré", email: "aicha.traore@payrollflow.demo", phone: "+33 7 08 44 21 90", departmentId: uid("dep", 4), jobTitle: "Cheffe des opérations", contractType: "CDI", hireDate: "2018-11-04", baseSalary: 3900, status: "active", iban: "FR76 ACCT-000022 7890 123", city: "Paris", address: "55 BOULEVARD VOLTAIRE", postalCode: "75011" }),
    staff(6, { firstName: "Léa", lastName: "Moreau", email: "lea.moreau@payrollflow.demo", phone: "+33 6 77 12 45 08", departmentId: uid("dep", 5), jobTitle: "Contrôleuse de gestion", contractType: "CDI", hireDate: "2023-02-20", baseSalary: 3600, status: "on_leave", iban: "FR76 ACCT-000015 7890 123", city: "Bordeaux", address: "8 COURS DE L INTENDANCE", postalCode: "33000" }),
    staff(7, { firstName: "Omar", lastName: "Benali", email: "omar.benali@payrollflow.demo", phone: "+33 7 11 90 22 54", departmentId: uid("dep", 3), jobTitle: "Développeur backend", contractType: "CDI", hireDate: "2024-01-15", baseSalary: 3400, status: "active", iban: "FR76 ACCT-000040 7890 123", city: "Marseille", address: "14 LA CANEBIERE", postalCode: "13001" }),
    staff(8, { firstName: "Camille", lastName: "Roux", email: "camille.roux@payrollflow.demo", phone: "+33 6 02 88 41 17", departmentId: uid("dep", 2), jobTitle: "Chargée RH", contractType: "CDD", hireDate: "2025-03-01", baseSalary: 2800, status: "active", iban: "FR76 ACCT-000035 7890 123", city: "Lille", address: "3 RUE FAIDHERBE", postalCode: "59000" }),
    staff(9, { firstName: "Kwame", lastName: "Mensah", email: "kwame.mensah@payrollflow.demo", phone: "+33 6 24 55 01 92", departmentId: uid("dep", 3), jobTitle: "Ingénieur frontend", contractType: "CDI", hireDate: "2023-07-10", baseSalary: 3700, status: "active", iban: "FR76 ACCT-000018 7890 123", city: "Paris", address: "27 RUE OBERKAMPF", postalCode: "75011" }),
    staff(10, { firstName: "Sofia", lastName: "Martins", email: "sofia.martins@payrollflow.demo", phone: "+33 6 41 77 03 29", departmentId: uid("dep", 5), jobTitle: "Comptable paie", contractType: "CDI", hireDate: "2021-04-19", baseSalary: 3100, status: "active", iban: "FR76 ACCT-000012 7890 123", city: "Toulouse", address: "11 RUE D ALSACE LORRAINE", postalCode: "31000" }),
    staff(11, { firstName: "Yanis", lastName: "Haddad", email: "yanis.haddad@payrollflow.demo", phone: "+33 7 33 10 64 82", departmentId: uid("dep", 4), jobTitle: "Coordinateur logistique", contractType: "CDI", hireDate: "2022-01-03", baseSalary: 2950, status: "active", iban: "FR76 ACCT-000007 7890 123", city: "Strasbourg", address: "6 PLACE KLEBER", postalCode: "67000" }),
    staff(12, { firstName: "Inès", lastName: "Petit", email: "ines.petit@payrollflow.demo", phone: "+33 6 90 14 55 61", departmentId: uid("dep", 3), jobTitle: "Apprentie QA", contractType: "Alternance", hireDate: "2025-09-01", baseSalary: 1450, status: "active", iban: "FR76 ACCT-000041 7890 123", city: "Rennes", address: "2 RUE SAINT MICHEL", postalCode: "35000", category: "Non Cadre", coefficient: "150", mealTicket5: 10 }),
    staff(13, {
      firstName: "Yao",
      lastName: "Lassidan",
      email: "yao.lassidan@payrollflow.demo",
      phone: "+33 6 12 12 08 31",
      departmentId: uid("dep", 6),
      jobTitle: "Technicien Inventaire Informat",
      contractType: "CDI",
      hireDate: "2023-09-27",
      baseSalary: 827.23,
      status: "active",
      iban: "FR76 ACCT-000012 1212 000",
      city: "GENTILLY",
      civility: "M",
      matricule: "1212",
      address: "2 RUE ARISTIDE BRIAND",
      postalCode: "94250",
      socialSecurityNumber: "1000299326201 35",
      category: "Non Cadre",
      coefficient: "220",
      classificationIndex: "1.3.1",
      qualification: "",
      contractHours: 56,
      pasRate: 0,
      mealTicket5: 4,
      mealTicket1650: 2,
    }),
  ];

  const settings = {
    companyName: "ANTARES DS",
    companyAddress: "10 RUE DE L ASIPRANT D'ARGENT",
    companyPostalCode: "92300",
    companyCity: "LEVALLOIS PERRET",
    siret: "43431517200040",
    ape: "7112B",
    conventionCollective: "Syntec",
    paymentMethod: "Virement",
    currency: "EUR" as const,
    workingDays: 22,
    monthlyHours: 151.67,
    overtimeRate: 1.25,
    smicHourly: 11.88,
    fillonT: 0.3195,
    advanceCapRatio: 0.3,
  };

  const extras: Record<string, { overtimeHours: number; bonus: number; workedDays: number }> = {
    [uid("emp", 2)]: { overtimeHours: 8, bonus: 400, workedDays: 22 },
    [uid("emp", 4)]: { overtimeHours: 6, bonus: 200, workedDays: 22 },
    [uid("emp", 6)]: { overtimeHours: 0, bonus: 0, workedDays: 12 },
    [uid("emp", 7)]: { overtimeHours: 10, bonus: 150, workedDays: 22 },
    [uid("emp", 12)]: { overtimeHours: 0, bonus: 0, workedDays: 22 },
    [uid("emp", 13)]: { overtimeHours: 0, bonus: 0, workedDays: 22 },
  };

  const periods = [
    { id: uid("per", 1), year: 2026, month: 7, status: "paid" as const, createdAt: "2026-07-28T09:00:00.000Z", calculatedAt: "2026-07-29T10:00:00.000Z", validatedAt: "2026-07-30T14:00:00.000Z", paidAt: "2026-07-31T08:00:00.000Z" },
    { id: uid("per", 2), year: 2026, month: 8, status: "validated" as const, createdAt: "2026-08-27T09:00:00.000Z", calculatedAt: "2026-08-28T11:00:00.000Z", validatedAt: "2026-08-29T16:00:00.000Z", paidAt: "2026-08-31T08:00:00.000Z" },
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
        smicHourly: settings.smicHourly,
        fillonT: settings.fillonT,
        rates,
      });
    });
  });

  const network = buildNetwork();

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
    clients: network.clients,
    partners: network.partners,
    invoices: network.invoices,
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

export function buildNetwork() {
  const clients = [
    {
      id: "cli-001",
      kind: "internal" as const,
      name: "ANTARES DS — CDP TRANSFERT",
      siret: "43431517200040",
      city: "Levallois-Perret",
      contact: "Fatou Ndiaye",
      email: "cdp.interne@payrollflow.demo",
      website: "",
      notes: "Client interne : refacturation des techniciens inventaire vers le pôle CDP.",
    },
    {
      id: "cli-002",
      kind: "external" as const,
      name: "NordSoft SAS",
      siret: "81234567800021",
      city: "Lyon",
      contact: "Élodie Marin",
      email: "achats@nordsoft.demo",
      website: "https://www.ovhcloud.com",
      notes: "Client externe : missions régie cloud facturées au TJM.",
    },
    {
      id: "cli-003",
      kind: "external" as const,
      name: "Mairie de Gentilly",
      siret: "21940028800015",
      city: "Gentilly",
      contact: "Service informatique",
      email: "dsi@gentilly.demo",
      website: "https://www.ville-gentilly.fr",
      notes: "Marché public d’inventaire parc — facturation mensuelle.",
    },
  ];

  const partners = [
    {
      id: "par-001",
      kind: "internal" as const,
      firstName: "Yao",
      lastName: "Lassidan",
      email: "yao.lassidan@payrollflow.demo",
      phone: "+33 6 12 12 08 31",
      jobTitle: "Technicien inventaire",
      employeeId: "emp-013",
      companyName: "ANTARES DS",
      dailyRate: 0,
      vatRate: 0,
      status: "active" as const,
      notes: "Salarié interne : bulletin de paie officiel (matricule 1212).",
      createdAt: "2023-09-27T08:00:00.000Z",
    },
    {
      id: "par-002",
      kind: "internal_client" as const,
      firstName: "Claire",
      lastName: "Dupont",
      email: "claire.dupont@payrollflow.demo",
      phone: "+33 1 41 49 00 12",
      jobTitle: "Référente client interne Finance",
      clientId: "cli-001",
      companyName: "ANTARES DS — CDP TRANSFERT",
      dailyRate: 0,
      vatRate: 0,
      status: "active" as const,
      notes: "Point de contact interne qui commande les missions et valide les temps.",
      createdAt: "2025-01-10T09:00:00.000Z",
    },
    {
      id: "par-003",
      kind: "freelance" as const,
      firstName: "Maya",
      lastName: "Okoro",
      email: "maya.okoro@okoro-studio.demo",
      phone: "+33 6 88 41 20 03",
      jobTitle: "UX / design bulletin",
      companyName: "Okoro Studio",
      dailyRate: 550,
      vatRate: 0.2,
      status: "active" as const,
      notes: "Freelance : honoraires, pas de bulletin. Elle nous facture.",
      createdAt: "2026-03-02T10:00:00.000Z",
    },
    {
      id: "par-004",
      kind: "auto_entrepreneur" as const,
      firstName: "Karim",
      lastName: "Bensaïd",
      email: "karim.bensaid@ae.demo",
      phone: "+33 7 12 44 90 18",
      jobTitle: "Rédacteur paie / formation",
      companyName: "KB Conseil",
      dailyRate: 320,
      vatRate: 0,
      status: "active" as const,
      notes: "Auto-entrepreneur franchise en base TVA.",
      createdAt: "2026-04-15T10:00:00.000Z",
    },
    {
      id: "par-005",
      kind: "contractor" as const,
      firstName: "Luis",
      lastName: "Fernandez",
      email: "luis.fernandez@payrollflow.demo",
      phone: "+33 6 22 18 77 41",
      jobTitle: "Ingénieur cloud en régie",
      clientId: "cli-002",
      companyName: "Fernandez Tech",
      dailyRate: 480,
      vatRate: 0.2,
      status: "active" as const,
      notes: "Prestataire en mission chez NordSoft : on facture le client, on lui règle ses honoraires.",
      createdAt: "2026-02-01T09:00:00.000Z",
    },
    {
      id: "par-006",
      kind: "temp" as const,
      firstName: "Chloé",
      lastName: "Lambert",
      email: "chloe.lambert@agence-interim.demo",
      phone: "+33 6 01 55 19 70",
      jobTitle: "Assistante administrative",
      companyName: "Adecco / agence Levallois",
      dailyRate: 180,
      vatRate: 0.2,
      status: "active" as const,
      notes: "Intérimaire : pas de bulletin ANTARES, facture d’agence.",
      createdAt: "2026-08-18T08:00:00.000Z",
    },
    {
      id: "par-007",
      kind: "portage" as const,
      firstName: "Sami",
      lastName: "El Khoury",
      email: "sami.elkhoury@portage.demo",
      phone: "+33 6 77 03 41 28",
      jobTitle: "Consultant SIRH",
      clientId: "cli-002",
      companyName: "ITG Portage",
      dailyRate: 620,
      vatRate: 0.2,
      status: "active" as const,
      notes: "Portage salarial : le salarié est payé par la société de portage, on facture le client.",
      createdAt: "2026-05-20T08:00:00.000Z",
    },
    {
      id: "par-008",
      kind: "intern" as const,
      firstName: "Inès",
      lastName: "Petit",
      email: "ines.petit@payrollflow.demo",
      phone: "+33 6 90 14 55 61",
      jobTitle: "Apprentie QA",
      employeeId: "emp-012",
      companyName: "ANTARES DS",
      dailyRate: 0,
      vatRate: 0,
      status: "active" as const,
      notes: "Alternance déjà en paie (bulletin). Conservée ici pour le suivi des missions.",
      createdAt: "2025-09-01T08:00:00.000Z",
    },
  ];

  const invoices = [
    {
      id: "inv-001",
      direction: "receivable" as const,
      clientId: "cli-002",
      partnerId: "par-005",
      number: "FA-2026-0812",
      date: "2026-08-31",
      label: "Régie cloud Luis Fernandez — 12 jours août 2026",
      amountHt: 5760,
      vatRate: 0.2,
      status: "paid" as const,
      createdAt: "2026-08-31T16:00:00.000Z",
    },
    {
      id: "inv-002",
      direction: "receivable" as const,
      clientId: "cli-003",
      partnerId: "par-001",
      number: "FA-2026-0813",
      date: "2026-08-31",
      label: "Inventaire parc informatique — forfait août 2026",
      amountHt: 1840,
      vatRate: 0.2,
      status: "sent" as const,
      createdAt: "2026-08-31T17:00:00.000Z",
    },
    {
      id: "inv-003",
      direction: "payable" as const,
      clientId: "cli-001",
      partnerId: "par-003",
      number: "FS-OKORO-091",
      date: "2026-09-05",
      label: "Honoraires design bulletin officiel",
      amountHt: 1650,
      vatRate: 0.2,
      status: "sent" as const,
      createdAt: "2026-09-05T11:00:00.000Z",
    },
    {
      id: "inv-004",
      direction: "receivable" as const,
      clientId: "cli-001",
      partnerId: "par-001",
      number: "FA-INT-2026-08",
      date: "2026-08-31",
      label: "Refacturation interne CDP — temps Yao Lassidan",
      amountHt: 980,
      vatRate: 0,
      status: "paid" as const,
      createdAt: "2026-08-31T18:00:00.000Z",
    },
  ];

  return { clients, partners, invoices };
}
