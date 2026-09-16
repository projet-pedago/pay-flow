import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { moneyExact, percent } from "@/lib/format";
import type { Employee, PayslipPreview } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export function PayslipCalcPage() {
  const employees = useApi<Employee[]>("/api/employees");
  const [employeeId, setEmployeeId] = useState("");
  const [workedDays, setWorkedDays] = useState(22);
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [preview, setPreview] = useState<PayslipPreview | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!employeeId && employees.data?.[0]) setEmployeeId(employees.data[0].id);
  }, [employees.data, employeeId]);

  async function simulate() {
    if (!employeeId) return;
    setSaving(true);
    try {
      const result = await api<PayslipPreview>("/api/payroll/preview", {
        method: "POST",
        body: JSON.stringify({ employeeId, workedDays, overtimeHours, bonus, advance }),
      });
      setPreview(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation impossible");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (employeeId) void simulate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- simulate on employee pick
  }, [employeeId]);

  if (employees.loading) return <LoadingState label="Chargement du moteur de paie…" />;
  if (employees.error) return <ErrorState message={employees.error} onRetry={employees.reload} />;

  const currency = preview?.settings.currency ?? "EUR";
  const highlight = new Set(["gross", "net", "cost"]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl">Calcul du bulletin</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          Même moteur que la fiche de paie officielle : prorata des jours, heures sup, cotisations, Fillon, tickets
          repas, acompte et prélèvement à la source.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label>Salarié</Label>
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {(employees.data ?? []).map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName} · {employee.jobTitle}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Jours travaillés</Label>
            <Input type="number" min={0} max={31} value={workedDays} onChange={(e) => setWorkedDays(Number(e.target.value))} />
          </div>
          <div>
            <Label>Heures sup.</Label>
            <Input type="number" min={0} value={overtimeHours} onChange={(e) => setOvertimeHours(Number(e.target.value))} />
          </div>
          <div>
            <Label>Prime €</Label>
            <Input type="number" min={0} value={bonus} onChange={(e) => setBonus(Number(e.target.value))} />
          </div>
          <div>
            <Label>Acompte €</Label>
            <Input type="number" min={0} value={advance} onChange={(e) => setAdvance(Number(e.target.value))} />
          </div>
          <div className="md:col-span-5 flex justify-end">
            <Button onClick={() => void simulate()} disabled={saving}>
              {saving ? "Calcul…" : "Recalculer"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Kpi label="Brut" value={moneyExact(preview.payslip.gross, currency)} />
            <Kpi label="Net à payer" value={moneyExact(preview.payslip.net, currency)} accent />
            <Kpi label="Coût employeur" value={moneyExact(preview.payslip.employerCost, currency)} />
          </div>

          <Card>
            <CardHeader>
              <div>
                <h3 className="font-display text-xl">Étapes du calcul</h3>
                <p className="text-sm text-ink/50">
                  {preview.employee.firstName} {preview.employee.lastName} · horaire {preview.employee.contractHours} h ·{" "}
                  {preview.settings.workingDays} jours ouvrés
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {preview.steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`grid gap-1 rounded-2xl border px-4 py-3 sm:grid-cols-[2.2fr_1fr] ${
                    highlight.has(step.id) ? "border-sage/30 bg-sage/5" : "border-ink/8"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {index + 1}. {step.title}
                    </p>
                    <p className="font-mono text-xs text-ink/50">{step.formula}</p>
                    <p className="mt-1 text-xs text-ink/45">{step.hint}</p>
                  </div>
                  <p className="self-center text-right font-display text-xl">{moneyExact(step.value, currency)}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h3 className="font-display text-xl">Cotisations de ce bulletin</h3>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink/40">
                    <th className="pb-2">Libellé</th>
                    <th className="pb-2">Base</th>
                    <th className="pb-2">Taux</th>
                    <th className="pb-2">Salarié</th>
                    <th className="pb-2">Employeur</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.payslip.lines
                    .filter((line) => line.kind === "contribution" || line.kind === "relief" || line.kind === "header")
                    .map((line) => (
                      <tr key={line.id} className="border-t border-ink/8">
                        <td className="py-2">{line.label}</td>
                        <td>{line.base != null ? moneyExact(line.base, currency) : "—"}</td>
                        <td>{line.employeeRate != null ? percent(line.employeeRate) : "—"}</td>
                        <td>{line.employeeAmount != null ? moneyExact(line.employeeAmount, currency) : "—"}</td>
                        <td>{line.employerAmount != null ? moneyExact(line.employerAmount, currency) : "—"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <p className="text-sm text-ink/50">
            Pour figer ce calcul sur un cycle :{" "}
            <Link to="/admin/paie" className="text-sage underline">
              Cycles de paie
            </Link>
            . Les taux se règlent dans{" "}
            <Link to="/admin/parametres" className="text-sage underline">
              Paramètres
            </Link>
            .
          </p>
        </>
      ) : null}
    </div>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-sage/30" : undefined}>
      <CardContent>
        <p className="text-sm text-ink/50">{label}</p>
        <p className="font-display mt-1 text-3xl">{value}</p>
      </CardContent>
    </Card>
  );
}
