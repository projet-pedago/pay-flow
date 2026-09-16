import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { moneyExact } from "@/lib/format";
import type {
  NetworkClient,
  NetworkInvoice,
  NetworkPartner,
  NetworkPartnerKind,
  NetworkPayload,
} from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

type Tab = "guide" | "partners" | "clients" | "invoices";

const kindStyle: Record<NetworkPartnerKind, string> = {
  internal: "bg-sage/15 text-sage-dark",
  internal_client: "bg-amber-100 text-amber-900",
  freelance: "bg-sky-100 text-sky-900",
  auto_entrepreneur: "bg-indigo-100 text-indigo-900",
  contractor: "bg-violet-100 text-violet-900",
  temp: "bg-orange-100 text-orange-900",
  portage: "bg-teal-100 text-teal-900",
  intern: "bg-zinc-200 text-zinc-700",
};

export function NetworkPage() {
  const query = useApi<NetworkPayload>("/api/network");
  const [tab, setTab] = useState<Tab>("guide");
  const [kindFilter, setKindFilter] = useState("all");

  if (query.loading) return <LoadingState label="Ouverture du réseau…" />;
  if (query.error || !query.data) return <ErrorState message={query.error ?? "Erreur"} onRetry={query.reload} />;

  const data = query.data;
  const catalogLabel = Object.fromEntries(data.catalog.map((item) => [item.kind, item.label]));
  const partners = data.partners.filter((item) => kindFilter === "all" || item.kind === kindFilter);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl">Réseau & facturation</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          Tout le monde n’est pas sur un bulletin. Ici : salariés internes, clients internes, missions facturées à
          d’autres entreprises, freelances, intérim, portage…
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Collaborateurs" value={String(data.summary.activePartners)} hint={`${data.summary.partners} fiches`} />
        <Kpi label="Clients" value={String(data.summary.clients)} hint="Internes + entreprises" />
        <Kpi label="Facturé HT" value={moneyExact(data.summary.billedHt)} hint="Émis vers d’autres sociétés" />
        <Kpi label="Honoraires HT" value={moneyExact(data.summary.costsHt)} hint="Freelances / prestataires" />
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["guide", "Qui est qui"],
            ["partners", "Collaborateurs"],
            ["clients", "Clients"],
            ["invoices", "Factures"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium",
              tab === id ? "bg-sage-dark text-white" : "bg-white text-ink/70 ring-1 ring-ink/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "guide" ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.catalog.map((item) => (
            <Card key={item.kind}>
              <CardContent className="space-y-2">
                <Badge className={kindStyle[item.kind]}>{item.label}</Badge>
                <p className="text-sm">{item.summary}</p>
                <p className="text-xs text-ink/50">Paie : {item.payroll}</p>
                <p className="text-xs text-ink/50">Facture : {item.billing}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "partners" ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
              <option value="all">Tous les profils</option>
              {data.catalog.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.label}
                </option>
              ))}
            </Select>
            <PartnerDialog catalog={data.catalog} clients={data.clients} employees={data.employees} onCreated={query.reload} />
          </div>
          <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
            {partners.map((partner) => (
              <div key={partner.id} className="grid gap-2 border-b border-ink/6 px-5 py-4 last:border-0 md:grid-cols-[1.4fr_1fr_auto]">
                <div>
                  <p className="font-semibold">
                    {partner.firstName} {partner.lastName}
                  </p>
                  <p className="text-sm text-ink/55">
                    {partner.jobTitle}
                    {partner.companyName ? ` · ${partner.companyName}` : ""}
                  </p>
                  {partner.notes ? <p className="mt-1 text-xs text-ink/45">{partner.notes}</p> : null}
                </div>
                <div className="text-sm">
                  <Badge className={kindStyle[partner.kind]}>{catalogLabel[partner.kind]}</Badge>
                  {partner.dailyRate > 0 ? (
                    <p className="mt-2 text-ink/60">TJM {moneyExact(partner.dailyRate)}</p>
                  ) : null}
                </div>
                <p className="text-sm text-ink/50">{partner.email}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "clients" ? (
        <div className="space-y-4">
          <div className="flex justify-end">
            <ClientDialog onCreated={query.reload} />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data.clients.map((client) => (
              <Card key={client.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-display text-xl">{client.name}</h3>
                      <p className="text-sm text-ink/55">{client.city}</p>
                    </div>
                    <Badge className={client.kind === "internal" ? "bg-amber-100 text-amber-900" : "bg-sage/15 text-sage-dark"}>
                      {client.kind === "internal" ? "Client interne" : "Entreprise cliente"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>Contact : {client.contact || "—"}</p>
                  <p>SIRET : {client.siret || "—"}</p>
                  <p className="text-ink/55">{client.notes}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "invoices" ? (
        <InvoicesPanel data={data} catalogLabel={catalogLabel} onReload={query.reload} />
      ) : null}
    </div>
  );
}

function InvoicesPanel({
  data,
  catalogLabel,
  onReload,
}: {
  data: NetworkPayload;
  catalogLabel: Record<string, string>;
  onReload: () => Promise<void>;
}) {
  const clients = useMemo(() => Object.fromEntries(data.clients.map((item) => [item.id, item])), [data.clients]);
  const partners = useMemo(() => Object.fromEntries(data.partners.map((item) => [item.id, item])), [data.partners]);

  async function setStatus(id: string, status: NetworkInvoice["status"]) {
    try {
      await api(`/api/network/invoices/${id}/status`, { method: "POST", body: JSON.stringify({ status }) });
      toast.success("Statut mis à jour");
      await onReload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <InvoiceDialog clients={data.clients} partners={data.partners} onCreated={onReload} />
      </div>
      <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
        {data.invoices.map((invoice) => {
          const client = clients[invoice.clientId];
          const partner = invoice.partnerId ? partners[invoice.partnerId] : undefined;
          const ttc = invoice.amountHt * (1 + invoice.vatRate);
          return (
            <div key={invoice.id} className="grid gap-2 border-b border-ink/6 px-5 py-4 last:border-0 md:grid-cols-[1.5fr_1fr_auto]">
              <div>
                <p className="font-semibold">
                  {invoice.number} · {invoice.label}
                </p>
                <p className="text-sm text-ink/55">
                  {invoice.direction === "receivable" ? "Émise vers" : "Reçue de"} {client?.name ?? "—"}
                  {partner ? ` · ${partner.firstName} ${partner.lastName}` : ""}
                </p>
                {partner ? (
                  <p className="mt-1 text-xs text-ink/40">{catalogLabel[partner.kind]}</p>
                ) : null}
              </div>
              <div>
                <p className="font-medium">{moneyExact(invoice.amountHt)} HT</p>
                <p className="text-xs text-ink/45">{moneyExact(ttc)} TTC · {invoice.date}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={
                    invoice.status === "paid"
                      ? "bg-emerald-100 text-emerald-900"
                      : invoice.status === "sent"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-zinc-200 text-zinc-700"
                  }
                >
                  {invoice.status === "paid" ? "Payée" : invoice.status === "sent" ? "Émise" : "Brouillon"}
                </Badge>
                {invoice.status !== "paid" ? (
                  <Button size="sm" variant="outline" onClick={() => void setStatus(invoice.id, invoice.status === "draft" ? "sent" : "paid")}>
                    {invoice.status === "draft" ? "Marquer émise" : "Marquer payée"}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PartnerDialog({
  catalog,
  clients,
  employees,
  onCreated,
}: {
  catalog: NetworkPayload["catalog"];
  clients: NetworkClient[];
  employees: NetworkPayload["employees"];
  onCreated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    kind: "freelance" as NetworkPartnerKind,
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    companyName: "",
    clientId: "",
    employeeId: "",
    dailyRate: 400,
    vatRate: 0.2,
    notes: "",
  });

  async function submit() {
    setSaving(true);
    try {
      await api("/api/network/partners", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          clientId: form.clientId || undefined,
          employeeId: form.employeeId || undefined,
        }),
      });
      toast.success("Collaborateur ajouté");
      setOpen(false);
      await onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nouveau collaborateur</Button>
      </DialogTrigger>
      <DialogContent title="Nouveau profil">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field label="Type">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as NetworkPartnerKind })}>
              {catalog.map((item) => (
                <option key={item.kind} value={item.kind}>
                  {item.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Poste / mission">
            <Input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} required />
          </Field>
          <Field label="Prénom">
            <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
          </Field>
          <Field label="Nom">
            <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Téléphone">
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label="Société / enseigne">
            <Input value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
          </Field>
          <Field label="Client lié">
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Aucun</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>
          {form.kind === "internal" || form.kind === "intern" ? (
            <Field label="Fiche employé (paie)">
              <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })}>
                <option value="">Pas encore en paie</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          <Field label="TJM €">
            <Input type="number" min={0} value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })} />
          </Field>
          <Field label="TVA">
            <Select value={String(form.vatRate)} onChange={(e) => setForm({ ...form, vatRate: Number(e.target.value) })}>
              <option value="0">0 %</option>
              <option value="0.2">20 %</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ClientDialog({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    kind: "external" as "internal" | "external",
    name: "",
    city: "",
    siret: "",
    contact: "",
    email: "",
    notes: "",
  });

  async function submit() {
    setSaving(true);
    try {
      await api("/api/network/clients", { method: "POST", body: JSON.stringify(form) });
      toast.success("Client ajouté");
      setOpen(false);
      await onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nouveau client</Button>
      </DialogTrigger>
      <DialogContent title="Nouveau client">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field label="Type">
            <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "internal" | "external" })}>
              <option value="internal">Client interne (pôle / filiale)</option>
              <option value="external">Entreprise à facturer</option>
            </Select>
          </Field>
          <Field label="Nom">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Ville">
            <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          </Field>
          <Field label="SIRET">
            <Input value={form.siret} onChange={(e) => setForm({ ...form, siret: e.target.value })} />
          </Field>
          <Field label="Contact">
            <Input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </Field>
          <Field label="Email">
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InvoiceDialog({
  clients,
  partners,
  onCreated,
}: {
  clients: NetworkClient[];
  partners: NetworkPartner[];
  onCreated: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    direction: "receivable" as "receivable" | "payable",
    clientId: "",
    partnerId: "",
    number: `FA-${today.replaceAll("-", "")}`,
    date: today,
    label: "",
    amountHt: 1000,
    vatRate: 0.2,
  });

  async function submit() {
    setSaving(true);
    try {
      await api("/api/network/invoices", {
        method: "POST",
        body: JSON.stringify({ ...form, partnerId: form.partnerId || undefined }),
      });
      toast.success("Facture enregistrée");
      setOpen(false);
      await onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nouvelle facture</Button>
      </DialogTrigger>
      <DialogContent title="Nouvelle facture">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <Field label="Sens">
            <Select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as "receivable" | "payable" })}>
              <option value="receivable">Émise (on facture une entreprise)</option>
              <option value="payable">Reçue (un freelance / prestataire nous facture)</option>
            </Select>
          </Field>
          <Field label="Client / entité">
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })} required>
              <option value="">Choisir…</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Collaborateur lié">
            <Select value={form.partnerId} onChange={(e) => setForm({ ...form, partnerId: e.target.value })}>
              <option value="">Aucun</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.firstName} {partner.lastName}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="N°">
            <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} required />
          </Field>
          <Field label="Date">
            <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </Field>
          <Field label="Montant HT €">
            <Input type="number" min={1} value={form.amountHt} onChange={(e) => setForm({ ...form, amountHt: Number(e.target.value) })} required />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Libellé">
              <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
            </Field>
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "Enregistrement…" : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm text-ink/50">{label}</p>
        <p className="font-display mt-1 text-2xl">{value}</p>
        <p className="text-xs text-ink/40">{hint}</p>
      </CardContent>
    </Card>
  );
}
