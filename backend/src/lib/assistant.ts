import type { Employee, Role, Store } from "../types.js";
import { buildCalcSteps } from "./calc-steps.js";
import { leaveBalancesFor } from "./leave-balance.js";
import { LEAVE_LABELS } from "./dates.js";
import { calculatePayslip } from "./payroll.js";

function money(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }).format(value);
}

function fold(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

function currentSlips(store: Store) {
  return store.payslips.filter((item) => !item.superseded);
}

function lastSlip(store: Store, employeeId: string) {
  const periods = [...store.periods].sort((a, b) => b.year - a.year || b.month - a.month);
  for (const period of periods) {
    const slip = currentSlips(store).find((item) => item.employeeId === employeeId && item.periodId === period.id);
    if (slip) return { slip, period };
  }
  return null;
}

function resolveEmployee(store: Store, user: { role: Role; employeeId?: string }, question: string): Employee | undefined {
  if (user.role === "employee" && user.employeeId) {
    return store.employees.find((item) => item.id === user.employeeId);
  }
  const q = fold(question);
  const hit = store.employees.find((item) => {
    const name = fold(`${item.firstName} ${item.lastName}`);
    return q.includes(fold(item.firstName)) && q.includes(fold(item.lastName)) || q.includes(name);
  });
  if (hit) return hit;
  return undefined;
}

function simulateFor(store: Store, employee: Employee, bonus: number, raisePercent: number) {
  const raised = {
    ...employee,
    baseSalary: Math.round(employee.baseSalary * (1 + raisePercent / 100) * 100) / 100,
  };
  return calculatePayslip({
    employee: raised,
    periodId: "preview",
    workedDays: store.settings.workingDays,
    overtimeHours: 0,
    bonus,
    advance: 0,
    workingDays: store.settings.workingDays,
    monthlyHours: store.settings.monthlyHours,
    overtimeRate: store.settings.overtimeRate,
    smicHourly: store.settings.smicHourly,
    fillonT: store.settings.fillonT,
    rates: store.rates,
  });
}

export const ASSISTANT_SUGGESTIONS_EMPLOYEE = [
  "Combien de jours de congés me reste-t-il ?",
  "Comment est calculé mon salaire ?",
  "Explique la ligne CSG de ma fiche de paie",
  "Simule une augmentation de 5 %",
];

export const ASSISTANT_SUGGESTIONS_ADMIN = [
  "Quelle est la masse salariale du dernier cycle ?",
  "Quels contrats arrivent à échéance ?",
  "Quelles anomalies RH sont ouvertes ?",
  "Simule une prime de 400 € pour Yao Lassidan",
];

export function answerAssistant(store: Store, user: { role: Role; employeeId?: string }, question: string) {
  const q = fold(question);
  const employee = resolveEmployee(store, user, question);
  const suggestions = user.role === "admin" ? ASSISTANT_SUGGESTIONS_ADMIN : ASSISTANT_SUGGESTIONS_EMPLOYEE;

  const raiseMatch = q.match(/augmentation[^0-9]{0,12}(\d+[.,]?\d*)\s*%/) ?? q.match(/(\d+[.,]?\d*)\s*%/);
  const bonusMatch = q.match(/prime[^0-9]{0,12}(\d+[.,]?\d*)/) ?? q.match(/bonus[^0-9]{0,12}(\d+[.,]?\d*)/);
  const wantsSim = /simule|simulation|augmenter|augmentation|prime/.test(q);

  if (wantsSim && employee) {
    const raise = raiseMatch ? Number(raiseMatch[1].replace(",", ".")) : 0;
    const bonus = bonusMatch ? Number(bonusMatch[1].replace(",", ".")) : /prime/.test(q) && !bonusMatch ? 400 : 0;
    const baseline = simulateFor(store, employee, 0, 0);
    const scenario = simulateFor(store, employee, bonus, raise);
    return {
      answer: [
        `Simulation pour ${employee.firstName} ${employee.lastName} (brut actuel ${money(employee.baseSalary)}).`,
        raise ? `Augmentation : +${raise} % → brut ${money(scenario.baseSalary)}.` : "Sans hausse de salaire de base.",
        bonus ? `Prime : ${money(bonus)} (soumise à cotisations).` : "Sans prime.",
        `Net à payer : ${money(baseline.net)} → ${money(scenario.net)} (${scenario.net - baseline.net >= 0 ? "+" : ""}${money(scenario.net - baseline.net)}).`,
        `Cotisations salariales : ${money(baseline.employeeCharges)} → ${money(scenario.employeeCharges)}.`,
        `Coût employeur : ${money(baseline.employerCost)} → ${money(scenario.employerCost)}.`,
        "Le brut monte, les charges aussi : le net n’augmente pas du même montant que la prime ou la hausse.",
      ].join("\n"),
      citations: [
        { title: "Moteur de paie (simulation)", link: user.role === "admin" ? "/admin/calcul" : "/espace/bulletins" },
      ],
      suggestions,
    };
  }

  if (/conge|rtt|solde|jours rest|absence/.test(q) && employee) {
    const bal = leaveBalancesFor(store, employee.id);
    const pending = store.leaves.filter((item) => item.employeeId === employee.id && item.status === "pending");
    const lines = [
      `${employee.firstName} : ${bal.cp.remaining} j de congés payés restants (${bal.cp.used} posés sur ${bal.cp.acquired}).`,
      `RTT : ${bal.rtt.remaining} j restants (${bal.rtt.used} posés sur ${bal.rtt.acquired}).`,
    ];
    if (pending.length) {
      lines.push(
        `Demandes en attente RH : ${pending.map((item) => `${LEAVE_LABELS[item.type]} ${item.startDate} → ${item.endDate}`).join(" ; ")}.`,
      );
    }
    lines.push("Maladie et sans solde ne consomment pas le solde CP/RTT. Un congé validé réduit les jours travaillés du cycle de paie.");
    return {
      answer: lines.join("\n"),
      citations: [{ title: "Congés", link: user.role === "admin" ? "/admin/conges" : "/espace/conges" }],
      suggestions,
    };
  }

  if ((/ligne|explique|csg|fillon|pas |prelevement|cotisation|net a payer|brut/.test(q) || /fiche de paie|bulletin/.test(q)) && employee) {
    const last = lastSlip(store, employee.id);
    if (!last) {
      return {
        answer: `Aucun bulletin calculé pour ${employee.firstName} ${employee.lastName} pour l’instant.`,
        citations: [{ title: "Cycles de paie", link: "/admin/paie" }],
        suggestions,
      };
    }
    const { slip, period } = last;
    const needle = q;
    const line = slip.lines.find((item) => fold(item.label).includes(needle.replace(/explique|cette|ligne|de|ma|fiche|paie/g, "").trim()) || (/csg/.test(needle) && fold(item.label).includes("csg")) || (/fillon|allegement/.test(needle) && fold(item.label).includes("allegement")) || (/pas|prelevement/.test(needle) && fold(item.label).includes("source")));
    const steps = buildCalcSteps({ employee, settings: store.settings, payslip: slip, workedDays: slip.workedDays });
    const parts = [
      `Dernier bulletin ${String(period.month).padStart(2, "0")}/${period.year} — ${employee.firstName} ${employee.lastName}.`,
      `Brut ${money(slip.gross)} · charges salariales ${money(slip.employeeCharges)} · net à payer ${money(slip.net)}.`,
      `Coût employeur ${money(slip.employerCost)} (après Fillon ${money(slip.employerRelief)}).`,
    ];
    if (line) {
      parts.push(
        `Ligne « ${line.label} » : base ${line.base != null ? money(line.base) : "—"}, part salarié ${line.employeeAmount != null ? money(line.employeeAmount) : "—"}, part employeur ${line.employerAmount != null ? money(line.employerAmount) : "—"}.`,
      );
    } else {
      parts.push("Parcours type : salaire de base → prorata des jours → + prime/HS → cotisations → indemnités repas → − acompte − PAS = net à payer.");
      parts.push(steps.find((item) => item.id === "net")?.hint ?? "");
    }
    return {
      answer: parts.join("\n"),
      citations: [
        {
          title: "Ouvrir le bulletin",
          link: user.role === "admin" ? `/admin/bulletins/${slip.id}` : `/espace/bulletins/${slip.id}`,
        },
      ],
      suggestions,
    };
  }

  if (/salaire|calcule|comment.*paie|net|brut/.test(q) && employee) {
    const last = lastSlip(store, employee.id);
    const slip = last?.slip ?? simulateFor(store, employee, 0, 0);
    return {
      answer: [
        `Le salaire de ${employee.firstName} part du brut contractuel (${money(employee.baseSalary)} / mois, ${employee.contractHours} h).`,
        `On proratise selon les jours travaillés (${slip.workedDays}/${store.settings.workingDays} → ${slip.hours} h payées).`,
        `Brut ${money(slip.gross)} − cotisations salariales ${money(slip.employeeCharges)} + indemnités − acompte − PAS = net ${money(slip.net)}.`,
        `L’entreprise, elle, paie aussi les charges patronales : coût ${money(slip.employerCost)}.`,
      ].join("\n"),
      citations: [{ title: "Calcul pas à pas", link: user.role === "admin" ? "/admin/calcul" : "/espace/bulletins" }],
      suggestions,
    };
  }

  if (/contrat|cdd|cdi|stage|alternance|echeance|expir/.test(q)) {
    if (user.role !== "admin" && employee) {
      return {
        answer: [
          `Contrat ${employee.contractType} depuis le ${employee.hireDate}.`,
          employee.contractEndDate
            ? `Fin prévue le ${employee.contractEndDate}${employee.contractEndDate < new Date().toISOString().slice(0, 10) ? " — à archiver." : "."}`
            : "Pas de date de fin (typique d’un CDI).",
        ].join(" "),
        citations: [{ title: "Mon profil", link: "/espace/profil" }],
        suggestions,
      };
    }
    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    const expiring = store.employees.filter(
      (item) => item.contractEndDate && item.status !== "terminated" && item.contractEndDate <= horizon,
    );
    const lines = expiring.length
      ? expiring.map((item) => {
          const end = item.contractEndDate ?? "";
          return `${item.firstName} ${item.lastName} · ${item.contractType} · fin ${end}${end < today ? " (expiré, à archiver)" : ""}`;
        })
      : ["Aucun contrat n’expire dans les 90 prochains jours."];
    return {
      answer: `Suivi des échéances (CDD, stage, alternance) :\n${lines.join("\n")}`,
      citations: [{ title: "Employés", link: "/admin/employes" }],
      suggestions,
    };
  }

  if (/attestation|certificat/.test(q)) {
    const link = user.role === "admin" ? "/admin/dossiers" : "/espace/dossier";
    return {
      answer:
        "Vous pouvez générer une attestation de travail ou un certificat de salaire depuis le dossier RH : document officiel à imprimer / PDF, avec le dernier net si un bulletin existe.",
      citations: [{ title: "Dossier RH", link }],
      suggestions,
    };
  }

  if (user.role === "admin" && (/masse|kpi|dashboard|prevision|anomal|absent/.test(q))) {
    const sorted = [...store.periods].sort((a, b) => b.year - a.year || b.month - a.month);
    const kpiPeriod = sorted.find((period) => currentSlips(store).some((slip) => slip.periodId === period.id));
    const slips = currentSlips(store).filter((item) => item.periodId === kpiPeriod?.id);
    const cost = slips.reduce((sum, item) => sum + item.employerCost, 0);
    const pending = store.leaves.filter((item) => item.status === "pending").length + store.advances.filter((item) => item.status === "pending").length;
    const onLeave = store.employees.filter((item) => item.status === "on_leave").length;
    const active = store.employees.filter((item) => item.status !== "terminated").length;
    return {
      answer: [
        kpiPeriod ? `Dernier cycle chiffré : ${String(kpiPeriod.month).padStart(2, "0")}/${kpiPeriod.year}.` : "Pas encore de cycle calculé.",
        `Masse salariale (coût employeur) : ${money(cost)}.`,
        `Effectif actif : ${active} · personnes en congé : ${onLeave}.`,
        `Prévision à 3 mois (à iso-périmètre) : ${money(cost)} / mois, soit ${money(cost * 3)} sur le trimestre.`,
        `Validations RH en attente : ${pending}.`,
        "Les écarts de bulletin (IBAN, dossiers, absences) sont listés dans le centre de conformité du tableau de bord.",
      ].join("\n"),
      citations: [{ title: "Pilotage", link: "/admin" }],
      suggestions,
    };
  }

  if (/acompte/.test(q)) {
    return {
      answer:
        "Un acompte se demande dans l’espace collaborateur. Le RH valide ; il est plafonné à 30 % du dernier net et déduit du bulletin du mois.",
      citations: [{ title: "Acomptes", link: user.role === "admin" ? "/admin/acomptes" : "/espace/acomptes" }],
      suggestions,
    };
  }

  return {
    answer: [
      "Je suis l’assistant RH de PayRollFlow. Je m’appuie sur vos données réelles (soldes, bulletins, contrats) — pas sur une invention.",
      user.role === "admin"
        ? "Exemples : masse salariale, contrats qui expirent, simulation d’une prime, explication d’une ligne de bulletin (citez le salarié)."
        : "Exemples : solde de congés, lecture de votre fiche de paie, simulation d’une augmentation.",
    ].join("\n"),
    citations: [],
    suggestions,
  };
}
