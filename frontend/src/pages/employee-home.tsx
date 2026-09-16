import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/states";
import { PeriodBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { money, monthLabel } from "@/lib/format";
import type { Department, Employee, PayrollPeriod, Payslip, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth";

type Summary = {
  settings: Settings;
  employee: Employee;
  department?: Department;
  currentPeriod: PayrollPeriod | null;
  lastPayslip: { payslip: Payslip; period?: PayrollPeriod } | null;
  payslipCount: number;
  ytdNet: number;
};

export function EmployeeHomePage() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApi<Summary>("/api/me/summary");

  if (loading) return <LoadingState label="Ouverture de votre espace…" />;
  if (error || !data) return <ErrorState message={error ?? "Impossible de charger l'espace"} onRetry={reload} />;

  const currency = data.settings.currency;
  const firstName = data.employee?.firstName ?? user?.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-employee-accent">Bonjour {firstName}</p>
        <h2 className="font-display mt-1 text-4xl text-employee">Votre paie, simplement</h2>
        <p className="mt-2 max-w-xl text-sm text-employee/60">
          {data.employee?.jobTitle} · {data.department?.name ?? "—"} · {data.settings.companyName}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link to="/espace/conges" className="rounded-3xl border border-employee-line bg-white px-4 py-3 text-sm">
          Poser un congé
        </Link>
        <Link to="/espace/acomptes" className="rounded-3xl border border-employee-line bg-white px-4 py-3 text-sm">
          Demander un acompte
        </Link>
        <Link to="/espace/dossier" className="rounded-3xl border border-employee-line bg-white px-4 py-3 text-sm">
          Compléter mon dossier
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="rounded-3xl border-employee-line shadow-none">
          <CardContent>
            <p className="text-sm text-employee/50">Dernier net</p>
            <p className="font-display mt-2 text-3xl">{data.lastPayslip ? money(data.lastPayslip.payslip.net, currency) : "—"}</p>
            <p className="mt-2 text-xs text-employee/40">
              {data.lastPayslip?.period ? monthLabel(data.lastPayslip.period.year, data.lastPayslip.period.month) : "Aucun bulletin"}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-employee-line shadow-none">
          <CardContent>
            <p className="text-sm text-employee/50">Bulletins disponibles</p>
            <p className="font-display mt-2 text-3xl">{data.payslipCount}</p>
            <Link to="/espace/bulletins" className="mt-2 inline-block text-sm text-employee-accent">
              Voir l’historique
            </Link>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-employee-line shadow-none">
          <CardContent>
            <p className="text-sm text-employee/50">Cycle en cours</p>
            {data.currentPeriod ? (
              <div className="mt-2 space-y-2">
                <p className="font-display text-2xl capitalize">{monthLabel(data.currentPeriod.year, data.currentPeriod.month)}</p>
                <PeriodBadge status={data.currentPeriod.status} />
              </div>
            ) : (
              <p className="mt-2 text-sm">Pas encore ouvert</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data.lastPayslip ? (
        <Card className="rounded-3xl border-employee-line bg-white shadow-none">
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-employee/50">Dernier bulletin</p>
              <p className="mt-1 font-semibold capitalize">
                {data.lastPayslip.period ? monthLabel(data.lastPayslip.period.year, data.lastPayslip.period.month) : "Bulletin"}
              </p>
              <p className="text-sm text-employee/55">
                Brut {money(data.lastPayslip.payslip.gross, currency)} · Net {money(data.lastPayslip.payslip.net, currency)}
              </p>
            </div>
            <Link
              to={`/espace/bulletins/${data.lastPayslip.payslip.id}`}
              className="rounded-full bg-employee px-4 py-2 text-sm font-semibold text-white"
            >
              Ouvrir le bulletin
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
