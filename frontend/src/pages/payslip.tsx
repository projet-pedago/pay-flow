import { Link, useParams } from "react-router-dom";
import { OfficialPayslip } from "@/components/official-payslip";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import type { BulletinMeta, Department, Employee, PayrollPeriod, Payslip, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Payload = {
  payslip: Payslip;
  employee: Employee;
  department: Department;
  period: PayrollPeriod;
  settings: Settings;
  bulletin: BulletinMeta;
};

export function PayslipPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const { data, error, loading, reload } = useApi<Payload>(id ? `/api/payroll/payslips/${id}` : null);

  if (loading) return <LoadingState label="Préparation du bulletin…" />;
  if (error || !data) return <ErrorState message={error ?? "Bulletin introuvable"} onRetry={reload} />;

  const { payslip, employee, department, period, settings, bulletin } = data;

  return (
    <div className="bg-[#e8e8e8] px-3 py-6 print:bg-white print:p-0">
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between">
        <Link
          to={user?.role === "admin" ? `/admin/paie/${period.id}` : "/espace/bulletins"}
          className="text-sm text-sage hover:underline"
        >
          ← Retour au cycle
        </Link>
        <Button variant="outline" onClick={() => window.print()}>
          Imprimer / PDF
        </Button>
      </div>
      <OfficialPayslip
        payslip={payslip}
        employee={employee}
        department={department}
        settings={settings}
        bulletin={bulletin}
      />
    </div>
  );
}
