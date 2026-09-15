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
import { money } from "@/lib/format";
import type { SalaryAdvance } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-800",
  settled: "bg-zinc-200 text-zinc-700",
};

export function AdvancesPage() {
  const { user } = useAuth();
  const admin = user?.role === "admin";
  const query = useApi<SalaryAdvance[]>("/api/advances");
  const now = new Date();
  const [amount, setAmount] = useState(300);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (query.loading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message={query.error ?? "Erreur"} onRetry={query.reload} />;

  async function submit() {
    setSaving(true);
    try {
      await api("/api/advances", {
        method: "POST",
        body: JSON.stringify({ amount, year: now.getFullYear(), month: now.getMonth() + 1, reason }),
      });
      toast.success("Acompte demandé");
      setReason("");
      await query.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Demande impossible");
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: string, status: "approved" | "rejected") {
    await api(`/api/advances/${id}/decide`, { method: "POST", body: JSON.stringify({ status }) });
    toast.success("Décision enregistrée");
    await query.reload();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl">{admin ? "Acomptes sur salaire" : "Mes acomptes"}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          Un acompte validé est déduit automatiquement du bulletin du mois — comme sur les plateformes paie du marché.
        </p>
      </div>

      {!admin ? (
        <Card>
          <CardContent>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                void submit();
              }}
            >
              <div>
                <Label>Montant</Label>
                <Input type="number" min={50} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
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
        {query.data.map((advance) => (
          <div key={advance.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/6 px-5 py-4 last:border-0">
            <div>
              <p className="font-semibold">
                {money(advance.amount)} · {String(advance.month).padStart(2, "0")}/{advance.year}
                {advance.employeeName ? ` · ${advance.employeeName}` : ""}
              </p>
              <p className="text-sm text-ink/55">{advance.reason}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusStyle[advance.status]}>{advance.status}</Badge>
              {admin && advance.status === "pending" ? (
                <>
                  <Button size="sm" onClick={() => void decide(advance.id, "approved")}>Valider</Button>
                  <Button size="sm" variant="outline" onClick={() => void decide(advance.id, "rejected")}>Refuser</Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
