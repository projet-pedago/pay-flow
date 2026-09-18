import { Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/states";
import { EmployeeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { initials, money } from "@/lib/format";
import { ficheBase } from "@/lib/roles";
import type { ContractType, Department, Employee, EmployeeDraft, EmployeeStatus, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export function EmployeesPage() {
  const { user } = useAuth();
  const fiches = ficheBase(user?.role === "hr" ? "hr" : "admin");
  const employees = useApi<Employee[]>("/api/employees");
  const departments = useApi<Department[]>("/api/departments");
  const settings = useApi<{ settings: Settings }>("/api/settings");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [departmentId, setDepartmentId] = useState("all");

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

  if (employees.loading || departments.loading) return <LoadingState />;
  if (employees.error) return <ErrorState message={employees.error} onRetry={employees.reload} />;

  const currency = settings.data?.settings.currency ?? "EUR";
  const deptMap = Object.fromEntries((departments.data ?? []).map((item) => [item.id, item]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Fiches RH</h2>
          <p className="mt-2 text-sm text-ink/60">
            {filtered.length} fiche{filtered.length > 1 ? "s" : ""} créée{filtered.length > 1 ? "s" : ""} à la
            première connexion Microsoft. Complétez contrat et salaire ici.
          </p>
        </div>
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
        <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] gap-4 border-b border-ink/8 px-5 py-3 text-xs font-semibold tracking-wide text-ink/45 uppercase md:grid">
          <span>Collaborateur</span>
          <span>Poste</span>
          <span>Contrat</span>
          <span>Salaire brut</span>
          <span>Microsoft</span>
          <span></span>
        </div>
        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink/50">
            Aucune fiche pour l’instant. Elle apparaît dès qu’un compte PAYFLOW_EMPLOYEE se connecte avec Microsoft.
          </p>
        ) : (
          filtered.map((employee) => (
            <Link
              key={employee.id}
              to={`${fiches}/${employee.id}`}
              className="grid gap-2 border-b border-ink/6 px-5 py-4 last:border-b-0 hover:bg-paper/70 md:grid-cols-[2fr_1.2fr_1fr_1fr_1fr_auto] md:items-center"
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
                    {deptMap[employee.departmentId]?.name ?? "—"} · {employee.entraUserPrincipalName || employee.email}
                  </p>
                </div>
              </div>
              <p className="text-sm">{employee.jobTitle}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm">{employee.contractType}</span>
                <EmployeeBadge status={employee.status} />
              </div>
              <p className="font-medium">{employee.baseSalary > 0 ? money(employee.baseSalary, currency) : "À renseigner"}</p>
              <p className="truncate text-xs text-ink/55">{employee.entraUserPrincipalName || "Entra"}</p>
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
      <Field label="Prénom (Microsoft)">
        <Input value={form.firstName} disabled />
      </Field>
      <Field label="Nom (Microsoft)">
        <Input value={form.lastName} disabled />
      </Field>
      <Field label="Email / UPN Microsoft">
        <Input type="email" value={form.entraUserPrincipalName || form.email} disabled />
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
      <Field label="Fin de contrat">
        <Input type="date" value={form.contractEndDate ?? ""} onChange={(e) => set("contractEndDate", e.target.value)} />
      </Field>
      <Field label="Salaire brut mensuel">
        <Input type="number" min={0} value={form.baseSalary} onChange={(e) => set("baseSalary", Number(e.target.value))} required />
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
        <Input value={form.matricule} onChange={(e) => set("matricule", e.target.value)} />
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
          <Input value={form.iban} onChange={(e) => set("iban", e.target.value)} />
        </Field>
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer le contrat et la paie"}
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
