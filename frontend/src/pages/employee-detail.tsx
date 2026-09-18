import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { EmployeeBadge, PeriodBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { money, monthLabel } from "@/lib/format";
import { staffBase } from "@/lib/roles";
import type { Department, Employee, PayrollPeriod, Payslip, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { EmployeeForm } from "@/pages/employees";

export function EmployeeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = staffBase(user?.role === "hr" ? "hr" : "admin");
  const isAdmin = user?.role === "admin";
  const employeeQuery = useApi<Employee>(id ? `/api/employees/${id}` : null);
  const departments = useApi<Department[]>("/api/departments");
  const settings = useApi<{ settings: Settings }>("/api/settings");
  const slipsQuery = useApi<Payslip[]>(isAdmin && id ? `/api/payroll/employee/${id}/payslips` : null);
  const periods = useApi<PayrollPeriod[]>(isAdmin ? "/api/payroll/periods" : null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Employee | null>(null);

  if (employeeQuery.loading) return <LoadingState />;
  if (employeeQuery.error || !employeeQuery.data) {
    return <ErrorState message={employeeQuery.error ?? "Employé introuvable"} onRetry={employeeQuery.reload} />;
  }

  const employee = draft ?? employeeQuery.data;
  const currency = settings.data?.settings.currency ?? "EUR";
  const periodMap = Object.fromEntries((periods.data ?? []).map((item) => [item.id, item]));

  async function save() {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await api<Employee>(`/api/employees/${id}`, {
        method: "PUT",
        body: JSON.stringify(employee),
      });
      setDraft(updated);
      toast.success("Profil mis à jour");
      await employeeQuery.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Mise à jour impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to={`${base === "/rh" ? "/rh" : `${base}/employes`}`} className="text-sm text-sage hover:underline">
            ← Tous les employés
          </Link>
          <h2 className="font-display mt-2 text-3xl">
            {employee.firstName} {employee.lastName}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <EmployeeBadge status={employee.status} />
            <span className="text-sm text-ink/55">{employee.jobTitle}</span>
          </div>
        </div>
        <Button onClick={() => void save()} disabled={saving}>
          {saving ? "Sauvegarde…" : "Enregistrer le profil"}
        </Button>
      </div>

      <MicrosoftLinkCard
        employee={employee}
        onLinked={(updated) => {
          setDraft(updated);
          void employeeQuery.reload();
        }}
      />

      <Card>
        <CardHeader>
          <h3 className="font-display text-xl">Fiche RH</h3>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            form={employee}
            departments={departments.data ?? []}
            onChange={(value) => setDraft({ ...employee, ...value })}
            onSubmit={() => void save()}
            saving={saving}
            showMicrosoftField={false}
          />
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to={`${base}/attestations/${employee.id}/travail`} className="text-sage underline">
              Attestation de travail
            </Link>
            <Link to={`${base}/attestations/${employee.id}/salaire`} className="text-sage underline">
              Certificat de salaire
            </Link>
          </div>
        </CardContent>
      </Card>

      {isAdmin && (slipsQuery.data ?? []).length > 0 ? (
        <Card>
          <CardHeader>
            <h3 className="font-display text-xl">Bulletins</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            {slipsQuery.data?.map((payslip) => {
              const period = periodMap[payslip.periodId];
              return (
                <Link
                  key={payslip.id}
                  to={`/admin/bulletins/${payslip.id}`}
                  className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3 hover:bg-[#ebe4d6]"
                >
                  <div className="space-y-1">
                    <p className="font-medium capitalize">
                      {period ? monthLabel(period.year, period.month) : "Cycle"}
                    </p>
                    {period ? <PeriodBadge status={period.status} /> : null}
                  </div>
                  <p className="font-semibold">{money(payslip.net, currency)}</p>
                </Link>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function MicrosoftLinkCard({
  employee,
  onLinked,
}: {
  employee: Employee;
  onLinked: (employee: Employee) => void;
}) {
  const [upn, setUpn] = useState(employee.entraUserPrincipalName ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUpn(employee.entraUserPrincipalName ?? "");
  }, [employee.id, employee.entraUserPrincipalName]);

  async function associate() {
    setSaving(true);
    try {
      const updated = await api<Employee>(`/api/employees/${employee.id}/microsoft-link`, {
        method: "PUT",
        body: JSON.stringify({ entraUserPrincipalName: upn }),
      });
      onLinked(updated);
      toast.success(
        "Compte Microsoft associé. Le salarié verra salaire, bulletins, contrat, congés et documents à la prochaine requête.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Association impossible");
    } finally {
      setSaving(false);
    }
  }

  const status = employee.entraObjectId
    ? `lié — oid enregistré${employee.entraUserPrincipalName ? ` · ${employee.entraUserPrincipalName}` : ""}`
    : employee.entraUserPrincipalName
      ? `en attente de connexion (${employee.entraUserPrincipalName})`
      : "non associé";

  return (
    <Card>
      <CardHeader>
        <div>
          <h3 className="font-display text-xl">Compte Microsoft</h3>
          <p className="mt-1 text-sm text-ink/55">
            Identité Entra : {status}. L’email de la fiche RH ({employee.email}) n’a pas besoin de correspondre à l’UPN.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="entra-upn">UPN Entra</Label>
          <Input
            id="entra-upn"
            type="email"
            value={upn}
            onChange={(event) => setUpn(event.target.value)}
            placeholder="emp-01@votre-tenant.onmicrosoft.com"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void associate()} disabled={saving || !upn.trim()}>
            {saving ? "Association…" : "Associer le compte Microsoft"}
          </Button>
          {employee.entraUserPrincipalName || employee.entraObjectId ? (
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                setUpn("");
                void (async () => {
                  setSaving(true);
                  try {
                    const updated = await api<Employee>(`/api/employees/${employee.id}/microsoft-link`, {
                      method: "PUT",
                      body: JSON.stringify({ entraUserPrincipalName: "" }),
                    });
                    onLinked(updated);
                    toast.success("Compte Microsoft dissocié.");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Dissociation impossible");
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              Dissocier
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
