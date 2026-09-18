import type { Store } from "../types.js";

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

export function createSeed(): Store {
  return {
    schemaVersion: 8,
    settings: {
      companyName: "ANTARES DS",
      companyAddress: "10 RUE DE L ASIPRANT D'ARGENT",
      companyPostalCode: "92300",
      companyCity: "LEVALLOIS PERRET",
      siret: "43431517200040",
      ape: "7112B",
      conventionCollective: "Syntec",
      paymentMethod: "Virement",
      currency: "EUR",
      workingDays: 22,
      monthlyHours: 151.67,
      overtimeRate: 1.25,
      smicHourly: 11.88,
      fillonT: 0.3195,
      advanceCapRatio: 0.3,
    },
    departments: [
      { id: uid("dep", 1), name: "Direction générale", code: "DG", budget: 180000, color: "#0f766e" },
      { id: uid("dep", 2), name: "Ressources humaines", code: "RH", budget: 96000, color: "#1d4ed8" },
      { id: uid("dep", 3), name: "Ingénierie", code: "ING", budget: 420000, color: "#7c3aed" },
      { id: uid("dep", 4), name: "Opérations", code: "OPS", budget: 210000, color: "#c2410c" },
      { id: uid("dep", 5), name: "Finance", code: "FIN", budget: 150000, color: "#0f172a" },
      { id: uid("dep", 6), name: "CDP TRANSFERT", code: "CDP", budget: 72000, color: "#475569" },
    ],
    employees: [],
    rates,
    periods: [],
    payslips: [],
    users: [],
    leaves: [],
    advances: [],
    documents: [],
    clients: [],
    partners: [],
    invoices: [],
    notifications: [],
    auditLog: [],
  };
}

export function buildUsers(): [] {
  return [];
}
