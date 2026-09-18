import { Link } from "react-router-dom";
import { EmptyState, ErrorState, LoadingState, UnlinkedEmployeeState } from "@/components/states";
import { PeriodBadge } from "@/components/status-badge";
import { money, monthLabel } from "@/lib/format";
import type { Department, Employee, PayrollPeriod, Payslip, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Row = { payslip: Payslip; period?: PayrollPeriod };
type Profile = { employee: Employee | null; department?: Department | null; settings: Settings };

export function EmployeePayslipsPage() {
  const slips = useApi<Row[]>("/api/me/payslips");
  const profile = useApi<Profile>("/api/me/profile");

  if (slips.loading) return <LoadingState />;
  if (slips.error) return <ErrorState message={slips.error} onRetry={slips.reload} />;

  if (!profile.data?.employee) {
    return <UnlinkedEmployeeState />;
  }

  const currency = profile.data?.settings.currency ?? "EUR";

  if (!slips.data?.length) {
    return <EmptyState title="Pas encore de bulletin" hint="Dès qu’un cycle sera calculé, il apparaîtra ici." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-4xl text-employee">Mes bulletins</h2>
        <p className="mt-2 text-sm text-employee/60">Consultez et imprimez uniquement vos propres fiches de paie.</p>
      </div>
      <div className="space-y-3">
        {slips.data.map(({ payslip, period }) => (
          <Link
            key={payslip.id}
            to={`/espace/bulletins/${payslip.id}`}
            className="flex items-center justify-between rounded-3xl border border-employee-line bg-white px-5 py-4"
          >
            <div className="space-y-1">
              <p className="font-semibold capitalize">
                {period ? monthLabel(period.year, period.month) : "Cycle"}
              </p>
              {period ? <PeriodBadge status={period.status} /> : null}
            </div>
            <p className="text-lg font-semibold">{money(payslip.net, currency)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
