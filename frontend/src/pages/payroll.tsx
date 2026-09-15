import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { EmptyState, ErrorState, LoadingState } from "@/components/states";
import { PeriodBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { monthLabel } from "@/lib/format";
import type { PayrollPeriod } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export function PayrollPage() {
  const { data, error, loading, reload } = useApi<PayrollPeriod[]>("/api/payroll/periods");
  const now = new Date();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  async function createPeriod() {
    setSaving(true);
    try {
      await api("/api/payroll/periods", { method: "POST", body: JSON.stringify({ year, month }) });
      toast.success("Cycle créé");
      setOpen(false);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Cycles de paie</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink/60">
            Brouillon → calcul → validation → paiement. Chaque étape met à jour le tableau de bord.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nouveau cycle</Button>
          </DialogTrigger>
          <DialogContent title="Ouvrir un cycle de paie">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void createPeriod();
              }}
            >
              <div>
                <Label>Année</Label>
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
              </div>
              <div>
                <Label>Mois</Label>
                <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Création…" : "Créer le cycle"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!data?.length ? (
        <EmptyState title="Aucun cycle" hint="Créez le premier mois de paie pour commencer le calcul." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((period) => (
            <Link key={period.id} to={`/admin/paie/${period.id}`}>
              <Card className="h-full transition hover:-translate-y-0.5">
                <CardContent className="space-y-4">
                  <div className="flex items-start justify-between">
                    <h3 className="font-display text-2xl capitalize">{monthLabel(period.year, period.month)}</h3>
                    <PeriodBadge status={period.status} />
                  </div>
                  <p className="text-sm text-ink/55">Créé le {new Date(period.createdAt).toLocaleDateString("fr-FR")}</p>
                  <p className="text-sm font-medium text-sage">Ouvrir le cycle →</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
