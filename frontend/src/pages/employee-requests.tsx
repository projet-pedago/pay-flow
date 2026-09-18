import { Link } from "react-router-dom";
import { ErrorState, LoadingState, UnlinkedEmployeeState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { moneyExact } from "@/lib/format";
import type { LeaveRequest, SalaryAdvance } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const style: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-800",
  settled: "bg-zinc-200 text-zinc-700",
};

export function EmployeeRequestsPage() {
  const leaves = useApi<{ leaves: LeaveRequest[]; balances: unknown[]; labels: Record<string, string> }>("/api/leaves");
  const advances = useApi<SalaryAdvance[]>("/api/advances");

  if (leaves.loading || advances.loading) return <LoadingState />;
  if (leaves.error) return <ErrorState message={leaves.error} onRetry={leaves.reload} />;
  if ((leaves.data?.balances.length ?? 0) === 0) return <UnlinkedEmployeeState />;

  const rows = [
    ...(leaves.data?.leaves ?? []).map((item) => ({
      id: item.id,
      kind: "Absence",
      label: `${leaves.data?.labels[item.type] ?? item.type} · ${item.days} j`,
      detail: `${item.startDate} → ${item.endDate}`,
      status: item.status,
      at: item.createdAt,
      link: "/espace/conges",
    })),
    ...(advances.data ?? []).map((item) => ({
      id: item.id,
      kind: "Acompte",
      label: moneyExact(item.amount),
      detail: item.reason,
      status: item.status,
      at: item.createdAt,
      link: "/espace/acomptes",
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-4xl text-employee">Historique des demandes</h2>
        <p className="mt-2 text-sm text-employee/60">Congés, RTT, maladie et acomptes — suivi du statut RH.</p>
      </div>
      <div className="overflow-hidden rounded-3xl border border-employee-line bg-white">
        {rows.length === 0 ? (
          <p className="px-5 py-8 text-sm text-employee/50">Aucune demande pour le moment.</p>
        ) : (
          rows.map((row) => (
            <Link key={row.id} to={row.link} className="flex flex-wrap items-center justify-between gap-3 border-b border-employee-line px-5 py-4 last:border-0">
              <div>
                <p className="text-xs text-employee/45">{row.kind}</p>
                <p className="font-semibold">{row.label}</p>
                <p className="text-sm text-employee/55">{row.detail}</p>
              </div>
              <Badge className={style[row.status] ?? style.pending}>{row.status}</Badge>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
