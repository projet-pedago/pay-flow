import { Building2, TrendingUp, Users, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ErrorState, LoadingState } from "@/components/states";
import { PeriodBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { monthLabel, money } from "@/lib/format";
import type { DashboardData } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export function DashboardPage() {
  const { data, error, loading, reload } = useApi<DashboardData>("/api/dashboard");

  if (loading) return <LoadingState label="Préparation du tableau de bord…" />;
  if (error || !data) return <ErrorState message={error ?? "Aucune donnée"} onRetry={reload} />;

  const currency = data.settings.currency;
  const kpis = [
    { label: "Effectif", value: String(data.kpis.headcount), hint: `${data.kpis.onLeave} en congé`, icon: Users },
    { label: "Brut du cycle", value: money(data.kpis.gross, currency), hint: "Dernier cycle disponible", icon: Wallet },
    { label: "Net à payer", value: money(data.kpis.net, currency), hint: `Moy. ${money(data.kpis.averageNet, currency)}`, icon: TrendingUp },
    { label: "Coût employeur", value: money(data.kpis.employerCost, currency), hint: "Charges incluses", icon: Building2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-sage uppercase">{data.settings.companyName}</p>
          <h2 className="font-display mt-1 text-3xl sm:text-4xl">Vue paie en temps réel</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink/60">
            {data.settings.companyCity} · les indicateurs se mettent à jour dès qu’un cycle est calculé, validé ou payé.
          </p>
        </div>
        {data.latestPeriod ? (
          <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <p className="text-xs text-ink/50">Cycle courant</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="font-semibold capitalize">{monthLabel(data.latestPeriod.year, data.latestPeriod.month)}</span>
              <PeriodBadge status={data.latestPeriod.status} />
            </div>
          </div>
        ) : null}
      </div>

      {data.alerts.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {data.alerts.map((alert) => (
            <div key={alert} className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              {alert}
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-ink/55">{kpi.label}</p>
                  <Icon className="h-4 w-4 text-sage" />
                </div>
                <p className="font-display text-3xl">{kpi.value}</p>
                <p className="text-xs text-ink/45">{kpi.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div>
              <h3 className="font-display text-xl">Masse salariale</h3>
              <p className="text-sm text-ink/50">Évolution brut / coût employeur par cycle</p>
            </div>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d7d0c4" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => money(Number(value), currency)} />
                <Bar dataKey="gross" name="Brut" fill="#1f6f5b" radius={[8, 8, 0, 0]} />
                <Bar dataKey="employerCost" name="Coût employeur" fill="#c4a574" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <h3 className="font-display text-xl">Par département</h3>
              <p className="text-sm text-ink/50">Coût vs budget mensuel</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.byDepartment.map((department) => {
              const ratio = department.budget ? Math.min(department.payroll / department.budget, 1) : 0;
              return (
                <div key={department.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{department.name}</span>
                    <span className="text-ink/55">
                      {department.headcount} · {money(department.payroll, currency)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: department.color }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-display text-xl">Répartition des effectifs</h3>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {data.byDepartment.map((department) => (
            <Link
              key={department.id}
              to="/departements"
              className="rounded-2xl border border-ink/8 bg-paper px-4 py-3 transition hover:-translate-y-0.5"
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: department.color }} />
                <span className="text-sm font-medium">{department.name}</span>
              </div>
              <p className="font-display text-2xl">{department.headcount}</p>
              <p className="text-xs text-ink/45">personnes</p>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
