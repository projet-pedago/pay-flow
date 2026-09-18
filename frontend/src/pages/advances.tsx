import { useState } from "react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import { money } from "@/lib/format";
import type { SalaryAdvance } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-800",
  settled: "bg-zinc-200 text-zinc-700",
};

const statusLabel: Record<string, string> = {
  pending: "En attente",
  approved: "Accepté",
  rejected: "Refusé",
  settled: "Soldé",
};

type Quota = { ratio: number; reference: number; cap: number; used: number; remaining: number; year: number; month: number };

export function AdvancesPage() {
  const { user } = useAuth();
  const staff = isStaff(user?.role ?? "employee");
  const query = useApi<SalaryAdvance[]>("/api/advances");
  const quota = useApi<Quota>(staff ? null : "/api/advances/quota");
  const now = new Date();
  const [amount, setAmount] = useState(300);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (query.loading || (!staff && quota.loading)) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message={query.error ?? "Erreur"} onRetry={query.reload} />;

  async function submit() {
    setSaving(true);
    try {
      await api("/api/advances", {
        method: "POST",
        body: JSON.stringify({ amount, year: now.getFullYear(), month: now.getMonth() + 1, reason }),
      });
      toast.success("Acompte demandé — le service RH a été notifié.");
      setReason("");
      await query.reload();
      await quota.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demande impossible");
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: string, status: "approved" | "rejected") {
    try {
      await api(`/api/advances/${id}/decide`, { method: "POST", body: JSON.stringify({ status }) });
      toast.success("Décision enregistrée");
      await query.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Décision impossible");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl">{staff ? "Acomptes sur salaire" : "Mes acomptes"}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          Un acompte validé est déduit automatiquement du bulletin du mois. Plafond : pourcentage du dernier net, configurable dans Paramètres.
        </p>
      </div>

      {!staff ? (
        <Card>
          <CardContent>
            {quota.data ? (
              <p className="mb-4 text-sm text-ink/60">
                Disponible ce mois : <strong>{money(quota.data.remaining)}</strong> sur un plafond de {money(quota.data.cap)} (
                {Math.round(quota.data.ratio * 100)} % du dernier net {money(quota.data.reference)}).
              </p>
            ) : null}
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div>
                <Label>Montant</Label>
                <Input type="number" min={1} max={quota.data?.remaining ?? undefined} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
              <div className="sm:col-span-2">
                <Label>Motif</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} required />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Envoi…" : "Demander un acompte"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
        {query.data.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink/50">Aucune demande d’acompte.</p>
        ) : (
          query.data.map((advance) => (
            <div key={advance.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/6 px-5 py-4 last:border-0">
              <div>
                <p className="font-semibold">
                  {money(advance.amount)} · {String(advance.month).padStart(2, "0")}/{advance.year}
                  {advance.employeeName ? ` · ${advance.employeeName}` : ""}
                </p>
                <p className="text-sm text-ink/55">{advance.reason}</p>
                {advance.decidedAt ? (
                  <p className="mt-1 text-xs text-ink/40">Décision le {new Date(advance.decidedAt).toLocaleDateString("fr-FR")}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={statusStyle[advance.status]}>{statusLabel[advance.status] ?? advance.status}</Badge>
                {staff && advance.status === "pending" ? (
                  <>
                    <Button size="sm" onClick={() => void decide(advance.id, "approved")}>Valider</Button>
                    <Button size="sm" variant="outline" onClick={() => void decide(advance.id, "rejected")}>Refuser</Button>
                  </>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
