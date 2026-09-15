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
import { initials, money } from "@/lib/format";
import type { ContractType, Department, Employee, EmployeeDraft, EmployeeStatus, Settings } from "@/lib/types";
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
};

export function EmployeesPage() {
  const employees = useApi<Employee[]>("/api/employees");
  const departments = useApi<Department[]>("/api/departments");
  const settings = useApi<{ settings: Settings }>("/api/settings");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const list = employees.data ?? [];
    const needle = query.trim().toLowerCase();
    return list.filter((employee) => {
      const haystack = `${employee.firstName} ${employee.lastName} ${employee.email} ${employee.jobTitle}`.toLowerCase();
      const matchQuery = !needle || haystack.includes(needle);
      const matchStatus = status === "all" || employee.status === status;
      const matchDept = departmentId === "all" || employee.departmentId === departmentId;
      return matchQuery && matchStatus && matchDept;
    });
  }, [employees.data, query, status, departmentId]);

  async function createEmployee() {
    setSaving(true);
    try {
      await api("/api/employees", { method: "POST", body: JSON.stringify(form) });
      toast.success("Employé créé");
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
              onChange={setForm}
              onSubmit={createEmployee}
              saving={saving}
            />
          </DialogContent>
        </Dialog>
      </div>

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
        <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_auto] gap-4 border-b border-ink/8 px-5 py-3 text-xs font-semibold tracking-wide text-ink/45 uppercase md:grid">
          <span>Collaborateur</span>
          <span>Poste</span>
          <span>Contrat</span>
          <span>Salaire brut</span>
          <span></span>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink/50">Aucun employé ne correspond à ces filtres.</p>
        ) : (
          filtered.map((employee) => (
            <Link
              key={employee.id}
              to={`/employes/${employee.id}`}
              className="grid gap-2 border-b border-ink/6 px-5 py-4 transition last:border-b-0 hover:bg-paper/70 md:grid-cols-[2fr_1.2fr_1fr_1fr_auto] md:items-center"
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
                <EmployeeBadge status={employee.status} />
              </div>
              <p className="font-medium">{money(employee.baseSalary, currency)}</p>
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
}: {
  form: EmployeeDraft;
  departments: Department[];
  onChange: (value: EmployeeDraft) => void;
  onSubmit: () => void;
  saving: boolean;
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
      <Field label="Email">
        <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
      </Field>
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
      <Field label="Salaire brut mensuel">
        <Input type="number" min={1} value={form.baseSalary} onChange={(e) => set("baseSalary", Number(e.target.value))} required />
      </Field>
      <Field label="Ville">
        <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
      </Field>
      <Field label="Pays">
        <Input value={form.country} onChange={(e) => set("country", e.target.value)} required />
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
