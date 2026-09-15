import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { PeriodBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { money, moneyExact, monthLabel } from "@/lib/format";
import type { ContributionRate, Employee, PayrollPeriod, Payslip, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Entry = {
  employeeId: string;
  workedDays: number;
  overtimeHours: number;
  bonus: number;
};

function preview(employee: Employee, entry: Entry, settings: Settings, rates: ContributionRate[]) {
  const ratio = Math.min(Math.max(entry.workedDays / settings.workingDays, 0), 1);
  const proratedBase = employee.baseSalary * ratio;
  const overtimePay = entry.overtimeHours * (employee.baseSalary / settings.monthlyHours) * settings.overtimeRate;
  const gross = proratedBase + overtimePay + entry.bonus;
  const csgBase = gross * 0.9825;
  const employeeCharges = rates.reduce((sum, rate) => {
    const base = rate.base === "csg" ? csgBase : gross;
    return sum + base * rate.employeeRate;
  }, 0);
  return { gross, net: gross - employeeCharges, employerCost: gross + rates.reduce((sum, rate) => sum + (rate.base === "csg" ? csgBase : gross) * rate.employerRate, 0) };
}

export function PeriodDetailPage() {
  const { id } = useParams();
  const payload = useApi<{ period: PayrollPeriod; payslips: Payslip[] }>(id ? `/api/payroll/periods/${id}` : null);
  const employeesQuery = useApi<Employee[]>("/api/employees");
  const settingsQuery = useApi<{ settings: Settings; rates: ContributionRate[] }>("/api/settings");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!payload.data || !employeesQuery.data) return;
    const slips = Object.fromEntries(payload.data.payslips.map((item) => [item.employeeId, item]));
    setEntries(
      employeesQuery.data
        .filter((employee) => employee.status !== "terminated")
        .map((employee) => ({
          employeeId: employee.id,
          workedDays: slips[employee.id]?.workedDays ?? 22,
          overtimeHours: slips[employee.id]?.overtimeHours ?? 0,
          bonus: slips[employee.id]?.bonus ?? 0,
        })),
    );
  }, [payload.data, employeesQuery.data]);

  const locked = payload.data?.period.status === "paid";
  const settings = settingsQuery.data?.settings;
  const rates = settingsQuery.data?.rates ?? [];
  const currency = settings?.currency ?? "EUR";
  const employeeMap = Object.fromEntries((employeesQuery.data ?? []).map((item) => [item.id, item]));

  const totals = useMemo(() => {
    if (!entries || !settings) return { gross: 0, net: 0, employerCost: 0 };
    return entries.reduce(
      (acc, entry) => {
        const employee = employeeMap[entry.employeeId];
        if (!employee) return acc;
        const next = preview(employee, entry, settings, rates);
        acc.gross += next.gross;
        acc.net += next.net;
        acc.employerCost += next.employerCost;
        return acc;
      },
      { gross: 0, net: 0, employerCost: 0 },
    );
  }, [entries, employeeMap, settings, rates]);

  if (payload.loading || employeesQuery.loading) return <LoadingState />;
  if (payload.error || !payload.data) return <ErrorState message={payload.error ?? "Cycle introuvable"} onRetry={payload.reload} />;

  const { period } = payload.data;

  function update(employeeId: string, patch: Partial<Entry>) {
    setEntries((current) =>
      (current ?? []).map((entry) => (entry.employeeId === employeeId ? { ...entry, ...patch } : entry)),
    );
  }

  async function run(action: "calculate" | "validate" | "pay") {
    if (!id) return;
    setBusy(action);
    try {
      if (action === "calculate") {
        await api(`/api/payroll/periods/${id}/calculate`, {
          method: "POST",
          body: JSON.stringify({ entries }),
        });
        toast.success("Paie calculée");
      } else {
        await api(`/api/payroll/periods/${id}/${action === "validate" ? "validate" : "pay"}`, { method: "POST" });
        toast.success(action === "validate" ? "Paie validée" : "Paiement enregistré");
      }
      await payload.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/admin/paie" className="text-sm text-sage hover:underline">
            ← Cycles de paie
          </Link>
          <h2 className="font-display mt-2 text-3xl capitalize">{monthLabel(period.year, period.month)}</h2>
          <div className="mt-2">
            <PeriodBadge status={period.status} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button disabled={locked || busy !== null} onClick={() => void run("calculate")}>
            {busy === "calculate" ? "Calcul…" : "Recalculer"}
          </Button>
          <Button variant="outline" disabled={period.status !== "calculated" || busy !== null} onClick={() => void run("validate")}>
            Valider
          </Button>
          <Button variant="dark" disabled={period.status !== "validated" || busy !== null} onClick={() => void run("pay")}>
            Marquer payé
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Brut estimé", totals.gross],
          ["Net estimé", totals.net],
          ["Coût employeur", totals.employerCost],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent>
              <p className="text-sm text-ink/50">{label}</p>
              <p className="font-display mt-1 text-2xl">{money(Number(value), currency)}</p>
              <p className="mt-1 text-xs text-ink/40">Se met à jour pendant la saisie</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto rounded-3xl border border-ink/10 bg-white">
        <table className="min-w-[860px] w-full text-sm">
          <thead className="border-b border-ink/8 text-left text-xs tracking-wide text-ink/45 uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Employé</th>
              <th className="px-4 py-3 font-semibold">Jours</th>
              <th className="px-4 py-3 font-semibold">HS</th>
              <th className="px-4 py-3 font-semibold">Prime</th>
              <th className="px-4 py-3 font-semibold">Net aperçu</th>
              <th className="px-4 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody>
            {(entries ?? []).map((entry) => {
              const employee = employeeMap[entry.employeeId];
              if (!employee || !settings) return null;
              const estimate = preview(employee, entry, settings, rates);
              const existing = payload.data?.payslips.find((item) => item.employeeId === employee.id);
              return (
                <tr key={entry.employeeId} className="border-b border-ink/6 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {employee.firstName} {employee.lastName}
                    </p>
                    <p className="text-xs text-ink/45">{employee.jobTitle}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      max={31}
                      value={entry.workedDays}
                      disabled={locked}
                      onChange={(e) => update(entry.employeeId, { workedDays: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      value={entry.overtimeHours}
                      disabled={locked}
                      onChange={(e) => update(entry.employeeId, { overtimeHours: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Input
                      type="number"
                      min={0}
                      value={entry.bonus}
                      disabled={locked}
                      onChange={(e) => update(entry.employeeId, { bonus: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-4 py-3 font-semibold">{moneyExact(estimate.net, currency)}</td>
                  <td className="px-4 py-3">
                    {existing ? (
                      <Link className="text-sage hover:underline" to={`/admin/bulletins/${existing.id}`}>
                        Bulletin
                      </Link>
                    ) : (
                      <span className="text-ink/35">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
