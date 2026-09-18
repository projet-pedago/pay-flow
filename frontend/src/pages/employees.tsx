import { Plus, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { EmployeeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials, money } from "@/lib/format";
import { staffBase } from "@/lib/roles";
import type { Civility, ContractType, Department, Employee, EmployeeDraft, EmployeeStatus, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  departmentId: "",
  jobTitle: "",
  contractType: "CDI" as ContractType,
  hireDate: new Date().toISOString().slice(0, 10),
  baseSalary: 3000,
  status: "active" as EmployeeStatus,
  iban: "",
  city: "",
  country: "France",
  civility: "M" as Civility,
  matricule: "",
  address: "",
  postalCode: "",
  socialSecurityNumber: "",
  category: "Non Cadre",
  coefficient: "220",
  classificationIndex: "1.3.1",
  qualification: "",
  contractHours: 151.67,
  pasRate: 0,
  mealTicket5: 0,
  mealTicket1650: 0,
  contractEndDate: "",
  entraUserPrincipalName: "",
};

export function EmployeesPage() {
  const { user } = useAuth();
  const base = staffBase(user?.role === "hr" ? "hr" : "admin");
  const employees = useApi<Employee[]>("/api/employees");
  const departments = useApi<Department[]>("/api/departments");
  const settings = useApi<{ settings: Settings }>("/api/settings");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [csv, setCsv] = useState(
    "firstName,lastName,email,phone,departmentCode,jobTitle,contractType,hireDate,baseSalary,iban,city,country\nNora,Sy,nora.sy@payrollflow.demo,+221 77 000 11 22,RH,Juriste sociale,CDI,2026-09-01,3300,FR76 ACCT-000044,Dakar,Sénégal",
  );
  const [importReport, setImportReport] = useState<
    { line: number; status: "created" | "skipped" | "error"; email?: string; reason?: string }[] | null
  >(null);

  const filtered = useMemo(() => {
    const list = employees.data ?? [];
    const needle = query.trim().toLowerCase();
    return list.filter((employee) => {
      const haystack =
        `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.jobTitle} ${employee.entraUserPrincipalName ?? ""}`.toLowerCase();
      const matchQuery = !needle || haystack.includes(needle);
      const matchStatus = status === "all" || employee.status === status;
      const matchDept = departmentId === "all" || employee.departmentId === departmentId;
      return matchQuery && matchStatus && matchDept;
    });
  }, [employees.data, query, status, departmentId]);

  async function createEmployee() {
    setSaving(true);
    try {
      const created = await api<Employee>("/api/employees", { method: "POST", body: JSON.stringify(form) });
      toast.success(
        `Fiche RH créée pour ${created.firstName} ${created.lastName}. Associez ensuite le UPN Entra depuis la fiche.`,
      );
      setOpen(false);
      setForm(emptyForm);
      await employees.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  if (employees.loading || departments.loading) return <LoadingState />;
  if (employees.error) return <ErrorState message={employees.error} onRetry={employees.reload} />;

  const currency = settings.data?.settings.currency ?? "EUR";
  const deptMap = Object.fromEntries((departments.data ?? []).map((item) => [item.id, item]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Employés</h2>
          <p className="mt-2 text-sm text-ink/60">
            {filtered.length} profil{filtered.length > 1 ? "s" : ""} · recherche et filtres appliqués instantanément.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              const file = await api<{ filename: string; csv: string }>("/api/employees/export");
              const blob = new Blob([file.csv], { type: "text/csv;charset=utf-8" });
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.download = file.filename;
              link.click();
            }}
          >
            Export Excel (CSV)
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setForm({ ...emptyForm, departmentId: departments.data?.[0]?.id ?? "" })}>
              <Plus className="h-4 w-4" />
              Nouvel employé
            </Button>
          </DialogTrigger>
          <DialogContent title="Ajouter un employé">
            <EmployeeForm
              form={form}
              departments={departments.data ?? []}
              onChange={(value) => setForm({ ...emptyForm, ...value, contractEndDate: value.contractEndDate ?? "" })}
              onSubmit={createEmployee}
              saving={saving}
            />
          </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-3">
          <p className="text-sm font-semibold">Import CSV (onboarding en masse)</p>
          <textarea
            className="h-24 w-full rounded-xl border border-ink/15 p-3 font-mono text-xs"
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const result = await api<{
                  imported: number;
                  skipped: number;
                  errors: number;
                  report: { line: number; status: "created" | "skipped" | "error"; email?: string; reason?: string }[];
                }>("/api/employees/import", {
                  method: "POST",
                  body: JSON.stringify({ csv }),
                });
                setImportReport(result.report);
                toast.success(`${result.imported} créé(s) · ${result.skipped} ignoré(s) · ${result.errors} erreur(s)`);
                await employees.reload();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Import impossible");
              }
            }}
          >
            Importer le fichier
          </Button>
          {importReport ? (
            <div className="overflow-hidden rounded-2xl border border-ink/10 text-xs">
              {importReport.map((row) => (
                <div key={`${row.line}-${row.email ?? ""}`} className="flex gap-3 border-b border-ink/6 px-3 py-2 last:border-0">
                  <span className="w-12 shrink-0 text-ink/40">L.{row.line}</span>
                  <span
                    className={
                      row.status === "created" ? "text-sage" : row.status === "skipped" ? "text-amber-700" : "text-red-700"
                    }
                  >
                    {row.status}
                  </span>
                  <span className="truncate text-ink/70">{row.email ?? "—"}</span>
                  <span className="text-ink/50">{row.reason ?? ""}</span>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute top-3 left-3 h-4 w-4 text-ink/35" />
            <Input className="pl-9" placeholder="Rechercher un nom, un poste, un email…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <Select value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
            <option value="all">Tous les départements</option>
            {(departments.data ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="on_leave">En congé</option>
            <option value="terminated">Sortis</option>
          </Select>
        </CardContent>
      </Card>

      <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
        <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-4 border-b border-ink/8 px-5 py-3 text-xs font-semibold tracking-wide text-ink/45 uppercase md:grid">
          <span>Collaborateur</span>
          <span>Poste</span>
          <span>Contrat</span>
          <span>Salaire brut</span>
          <span>Microsoft</span>
          <span></span>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink/50">Aucun employé ne correspond à ces filtres.</p>
        ) : (
          filtered.map((employee) => (
            <Link
              key={employee.id}
              to={`${base}/employes/${employee.id}`}
              className="grid gap-2 border-b border-ink/6 px-5 py-4 transition last:border-b-0 hover:bg-paper/70 md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] md:items-center"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-dark text-xs font-semibold text-white">
                  {initials(employee.firstName, employee.lastName)}
                </div>
                <div>
                  <p className="font-semibold">
                    {employee.firstName} {employee.lastName}
                  </p>
                  <p className="text-xs text-ink/50">
                    {deptMap[employee.departmentId]?.name ?? "—"} · {employee.city}
                  </p>
                </div>
              </div>
              <p className="text-sm">{employee.jobTitle}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm">{employee.contractType}</span>
                {employee.contractEndDate ? (
                  <span className="text-[11px] text-ink/45">fin {employee.contractEndDate}</span>
                ) : null}
                <EmployeeBadge status={employee.status} />
              </div>
              <p className="font-medium">{money(employee.baseSalary, currency)}</p>
              <p className="text-xs text-ink/55">
                {employee.entraObjectId
                  ? "Lié"
                  : employee.entraUserPrincipalName
                    ? "En attente"
                    : "Non associé"}
              </p>
              <span className="text-sm text-sage">Ouvrir</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

export function EmployeeForm({
  form,
  departments,
  onChange,
  onSubmit,
  saving,
  showMicrosoftField = true,
}: {
  form: EmployeeDraft;
  departments: Department[];
  onChange: (value: EmployeeDraft) => void;
  onSubmit: () => void;
  saving: boolean;
  showMicrosoftField?: boolean;
}) {
  function set<K extends keyof EmployeeDraft>(key: K, value: EmployeeDraft[K]) {
    onChange({ ...form, [key]: value });
  }

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label="Prénom">
        <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} required />
      </Field>
      <Field label="Nom">
        <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} required />
      </Field>
      <Field label="Email professionnel (fiche RH)">
        <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
      </Field>
      {showMicrosoftField ? (
        <Field label="Compte Microsoft (UPN Entra)">
          <Input
            type="email"
            value={form.entraUserPrincipalName ?? ""}
            onChange={(e) => set("entraUserPrincipalName", e.target.value)}
            placeholder="emp-01@votre-tenant.onmicrosoft.com"
          />
        </Field>
      ) : null}
      <Field label="Téléphone">
        <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} required />
      </Field>
      <Field label="Poste">
        <Input value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} required />
      </Field>
      <Field label="Département">
        <Select value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)} required>
          <option value="">Choisir…</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Contrat">
        <Select value={form.contractType} onChange={(e) => set("contractType", e.target.value as ContractType)}>
          <option>CDI</option>
          <option>CDD</option>
          <option>Stage</option>
          <option>Alternance</option>
        </Select>
      </Field>
      <Field label="Statut">
        <Select value={form.status} onChange={(e) => set("status", e.target.value as EmployeeStatus)}>
          <option value="active">Actif</option>
          <option value="on_leave">Congé</option>
          <option value="terminated">Sorti</option>
        </Select>
      </Field>
      <Field label="Date d'entrée">
        <Input type="date" value={form.hireDate} onChange={(e) => set("hireDate", e.target.value)} required />
      </Field>
      <Field label="Fin de contrat">
        <Input type="date" value={form.contractEndDate ?? ""} onChange={(e) => set("contractEndDate", e.target.value)} />
      </Field>
      <Field label="Salaire brut mensuel">
        <Input type="number" min={1} value={form.baseSalary} onChange={(e) => set("baseSalary", Number(e.target.value))} required />
      </Field>
      <Field label="Ville">
        <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
      </Field>
      <Field label="Pays">
        <Input value={form.country} onChange={(e) => set("country", e.target.value)} required />
      </Field>
      <Field label="Civilité">
        <Select value={form.civility} onChange={(e) => set("civility", e.target.value as EmployeeDraft["civility"])}>
          <option value="M">M</option>
          <option value="Mme">Mme</option>
        </Select>
      </Field>
      <Field label="Matricule">
        <Input value={form.matricule} onChange={(e) => set("matricule", e.target.value)} placeholder="1212" />
      </Field>
      <Field label="Adresse">
        <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
      </Field>
      <Field label="Code postal">
        <Input value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
      </Field>
      <Field label="N° sécu">
        <Input value={form.socialSecurityNumber} onChange={(e) => set("socialSecurityNumber", e.target.value)} />
      </Field>
      <Field label="Catégorie">
        <Select value={form.category} onChange={(e) => set("category", e.target.value)}>
          <option>Non Cadre</option>
          <option>Cadre</option>
        </Select>
      </Field>
      <Field label="Coefficient">
        <Input value={form.coefficient} onChange={(e) => set("coefficient", e.target.value)} />
      </Field>
      <Field label="Indice / classification">
        <Input value={form.classificationIndex} onChange={(e) => set("classificationIndex", e.target.value)} />
      </Field>
      <Field label="Qualification">
        <Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} />
      </Field>
      <Field label="Horaire mensuel (heures)">
        <Input type="number" step="0.001" value={form.contractHours} onChange={(e) => set("contractHours", Number(e.target.value))} />
      </Field>
      <Field label="Taux PAS">
        <Input type="number" step="0.001" value={form.pasRate} onChange={(e) => set("pasRate", Number(e.target.value))} />
      </Field>
      <Field label="Indem. repas 5 € (qté)">
        <Input type="number" min={0} value={form.mealTicket5} onChange={(e) => set("mealTicket5", Number(e.target.value))} />
      </Field>
      <Field label="Indem. repas 16,50 € (qté)">
        <Input type="number" min={0} value={form.mealTicket1650} onChange={(e) => set("mealTicket1650", Number(e.target.value))} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="IBAN">
          <Input value={form.iban} onChange={(e) => set("iban", e.target.value)} required />
        </Field>
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </form>
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
