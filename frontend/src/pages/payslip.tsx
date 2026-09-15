import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { moneyExact, monthLabel, percent } from "@/lib/format";
import type { Department, Employee, PayrollPeriod, Payslip, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Payload = {
  payslip: Payslip;
  employee: Employee;
  department: Department;
  period: PayrollPeriod;
  settings: Settings;
};

export function PayslipPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const { data, error, loading, reload } = useApi<Payload>(id ? `/api/payroll/payslips/${id}` : null);

  if (loading) return <LoadingState label="Préparation du bulletin…" />;
  if (error || !data) return <ErrorState message={error ?? "Bulletin introuvable"} onRetry={reload} />;

  const { payslip, employee, department, period, settings } = data;
  const currency = settings.currency;

  return (
    <div className="mx-auto max-w-4xl bg-white px-6 py-8 print:px-0">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          to={user?.role === "admin" ? `/admin/paie/${period.id}` : "/espace/bulletins"}
          className="text-sm text-sage hover:underline"
        >
          ← Retour au cycle
        </Link>
        <Button variant="outline" onClick={() => window.print()}>
          Imprimer
        </Button>
      </div>

      <article className="rounded-[32px] border border-ink/10 p-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink/10 pb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-sage uppercase">PayRollFlow</p>
            <h1 className="font-display mt-1 text-3xl">Bulletin de paie</h1>
            <p className="mt-1 capitalize text-ink/55">{monthLabel(period.year, period.month)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold">{settings.companyName}</p>
            <p className="text-ink/55">{settings.companyCity}</p>
          </div>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-2xl bg-paper p-4">
            <p className="text-xs text-ink/45 uppercase tracking-wide">Salarié</p>
            <p className="mt-1 text-lg font-semibold">
              {employee.firstName} {employee.lastName}
            </p>
            <p>{employee.jobTitle}</p>
            <p className="text-ink/55">
              {department?.name} · {employee.contractType}
            </p>
          </div>
          <div className="rounded-2xl bg-paper p-4">
            <p className="text-xs text-ink/45 uppercase tracking-wide">Coordonnées</p>
            <p className="mt-1">{employee.email}</p>
            <p>
              {employee.city}, {employee.country}
            </p>
            <p className="font-mono text-xs">{employee.iban}</p>
          </div>
        </section>

        <section className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-ink/10 text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="py-2">Libellé</th>
                <th className="py-2">Base</th>
                <th className="py-2">Taux sal.</th>
                <th className="py-2">Salarié</th>
                <th className="py-2">Taux pat.</th>
                <th className="py-2">Employeur</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink/6">
                <td className="py-2 font-medium">Salaire de base proratisé</td>
                <td colSpan={5} className="py-2">
                  {moneyExact(payslip.proratedBase, currency)} · {payslip.workedDays} jours
                </td>
              </tr>
              <tr className="border-b border-ink/6">
                <td className="py-2">Heures supplémentaires</td>
                <td colSpan={5} className="py-2">
                  {moneyExact(payslip.overtimePay, currency)} · {payslip.overtimeHours} h
                </td>
              </tr>
              <tr className="border-b border-ink/6">
                <td className="py-2">Prime</td>
                <td colSpan={5} className="py-2">
                  {moneyExact(payslip.bonus, currency)}
                </td>
              </tr>
              {payslip.lines.map((line) => (
                <tr key={line.label} className="border-b border-ink/6">
                  <td className="py-2">{line.label}</td>
                  <td className="py-2">{moneyExact(line.base, currency)}</td>
                  <td className="py-2">{percent(line.employeeRate)}</td>
                  <td className="py-2">{moneyExact(line.employeeAmount, currency)}</td>
                  <td className="py-2">{percent(line.employerRate)}</td>
                  <td className="py-2">{moneyExact(line.employerAmount, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-4">
          {[
            ["Brut", payslip.gross],
            ["Charges salariales", payslip.employeeCharges],
            ["Net à payer", payslip.net],
            ["Coût employeur", payslip.employerCost],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-2xl bg-sage-dark px-4 py-3 text-white">
              <p className="text-xs text-white/60">{label}</p>
              <p className="font-display text-xl">{moneyExact(Number(value), currency)}</p>
            </div>
          ))}
        </section>
        {payslip.advance ? (
          <p className="mt-4 text-sm text-ink/60">
            Acompte déjà versé : {moneyExact(payslip.advance, currency)} (déduit du net).
          </p>
        ) : null}
      </article>
    </div>
  );
}
