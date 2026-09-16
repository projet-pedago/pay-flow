import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { id, loadStore, mutate } from "../lib/store.js";
import type { InvoiceDirection, InvoiceStatus, NetworkClientKind, NetworkPartnerKind } from "../types.js";

export const PARTNER_CATALOG = [
  {
    kind: "internal",
    label: "Salarié interne",
    payroll: "Oui — bulletin",
    billing: "Parfois refacturé en interne",
    summary: "CDI, CDD, alternance : c’est la paie classique. Le net se calcule dans Cycles de paie.",
  },
  {
    kind: "internal_client",
    label: "Client interne",
    payroll: "Non",
    billing: "Refacturation intra-groupe / entre pôles",
    summary: "Un service ou une filiale qui « achète » du temps en interne (ex. CDP TRANSFERT).",
  },
  {
    kind: "freelance",
    label: "Freelance",
    payroll: "Non",
    billing: "Il vous facture (honoraires)",
    summary: "Indépendant. Pas de fiche de paie ANTARES : une facture à payer, TVA selon le régime.",
  },
  {
    kind: "auto_entrepreneur",
    label: "Auto-entrepreneur",
    payroll: "Non",
    billing: "Facture, souvent sans TVA",
    summary: "Micro-entreprise. Franchise en base de TVA tant que les seuils ne sont pas dépassés.",
  },
  {
    kind: "contractor",
    label: "Prestataire en mission",
    payroll: "Non (sauf s’il est aussi salarié)",
    billing: "Vous facturez l’entreprise cliente",
    summary: "Régie / sous-traitance : le collaborateur travaille chez un autre client, vous émettez la facture.",
  },
  {
    kind: "temp",
    label: "Intérimaire",
    payroll: "Payé par l’agence",
    billing: "Facture d’agence à régler",
    summary: "Aucun bulletin maison : l’ETT facture le salaire + coeff. d’agence.",
  },
  {
    kind: "portage",
    label: "Portage salarial",
    payroll: "Oui, chez la société de portage",
    billing: "Vous facturez le client final",
    summary: "Le consultant a un bulletin via le portage. Vous facturez la mission au client.",
  },
  {
    kind: "intern",
    label: "Stagiaire / alternant",
    payroll: "Gratification ou bulletin d’apprentissage",
    billing: "Rarement facturé",
    summary: "Si c’est une alternance déjà en paie, reliez la fiche employé. Un stage court peut rester hors bulletin.",
  },
];

export const networkRouter = Router();
networkRouter.use(requireAdmin);

const partnerKinds = [
  "internal",
  "internal_client",
  "freelance",
  "auto_entrepreneur",
  "contractor",
  "temp",
  "portage",
  "intern",
] as const;

const clientSchema = z.object({
  kind: z.enum(["internal", "external"]),
  name: z.string().min(2),
  siret: z.string().optional().default(""),
  city: z.string().optional().default(""),
  contact: z.string().optional().default(""),
  email: z.string().optional().default(""),
  website: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

const partnerSchema = z.object({
  kind: z.enum(partnerKinds),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().default(""),
  jobTitle: z.string().min(1),
  employeeId: z.string().optional(),
  clientId: z.string().optional(),
  companyName: z.string().optional().default(""),
  dailyRate: z.number().min(0).optional().default(0),
  vatRate: z.number().min(0).max(1).optional().default(0),
  status: z.enum(["active", "ended"]).optional().default("active"),
  notes: z.string().optional().default(""),
});

const invoiceSchema = z.object({
  direction: z.enum(["receivable", "payable"]),
  clientId: z.string().min(1),
  partnerId: z.string().optional(),
  number: z.string().min(2),
  date: z.string().min(8),
  label: z.string().min(2),
  amountHt: z.number().positive(),
  vatRate: z.number().min(0).max(1).optional().default(0.2),
  status: z.enum(["draft", "sent", "paid"]).optional().default("draft"),
});

function totals(invoices: { direction: InvoiceDirection; amountHt: number; vatRate: number; status: InvoiceStatus }[]) {
  const ttc = (item: { amountHt: number; vatRate: number }) => item.amountHt * (1 + item.vatRate);
  const receivable = invoices.filter((item) => item.direction === "receivable");
  const payable = invoices.filter((item) => item.direction === "payable");
  return {
    billedHt: receivable.reduce((sum, item) => sum + item.amountHt, 0),
    billedTtc: receivable.reduce((sum, item) => sum + ttc(item), 0),
    costsHt: payable.reduce((sum, item) => sum + item.amountHt, 0),
    costsTtc: payable.reduce((sum, item) => sum + ttc(item), 0),
    outstanding: receivable.filter((item) => item.status !== "paid").reduce((sum, item) => sum + ttc(item), 0),
  };
}

networkRouter.get("/", (_req, res) => {
  const store = loadStore();
  res.json({
    clients: store.clients,
    partners: store.partners,
    invoices: [...store.invoices].sort((a, b) => b.date.localeCompare(a.date)),
    employees: store.employees.map((item) => ({
      id: item.id,
      name: `${item.firstName} ${item.lastName}`,
      jobTitle: item.jobTitle,
    })),
    summary: {
      partners: store.partners.length,
      activePartners: store.partners.filter((item) => item.status === "active").length,
      clients: store.clients.length,
      invoices: store.invoices.length,
      ...totals(store.invoices),
    },
    catalog: PARTNER_CATALOG,
  });
});

networkRouter.post("/clients", (req, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Client incomplet" });
    return;
  }
  const created = mutate((store) => {
    const client = { id: id(), ...parsed.data, kind: parsed.data.kind as NetworkClientKind };
    store.clients.unshift(client);
    return client;
  });
  res.status(201).json(created);
});

networkRouter.post("/partners", (req, res) => {
  const parsed = partnerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Fiche collaborateur incomplète", details: parsed.error.flatten() });
    return;
  }
  const created = mutate((store) => {
    const partner = {
      id: id(),
      ...parsed.data,
      kind: parsed.data.kind as NetworkPartnerKind,
      createdAt: new Date().toISOString(),
    };
    store.partners.unshift(partner);
    return partner;
  });
  res.status(201).json(created);
});

networkRouter.post("/invoices", (req, res) => {
  const parsed = invoiceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Facture incomplète" });
    return;
  }
  const created = mutate((store) => {
    if (!store.clients.some((item) => item.id === parsed.data.clientId)) {
      return { error: "Client introuvable" as const };
    }
    const invoice = { id: id(), ...parsed.data, createdAt: new Date().toISOString() };
    store.invoices.unshift(invoice);
    return { invoice };
  });
  if ("error" in created) {
    res.status(400).json({ error: created.error });
    return;
  }
  res.status(201).json(created.invoice);
});

networkRouter.post("/invoices/:id/status", (req, res) => {
  const parsed = z.object({ status: z.enum(["draft", "sent", "paid"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Statut invalide" });
    return;
  }
  const updated = mutate((store) => {
    const invoice = store.invoices.find((item) => item.id === req.params.id);
    if (!invoice) return null;
    invoice.status = parsed.data.status;
    return invoice;
  });
  if (!updated) {
    res.status(404).json({ error: "Facture introuvable" });
    return;
  }
  res.json(updated);
});
