import { useState } from "react";
import { toast } from "sonner";
import { LeaveCalendar } from "@/components/leave-calendar";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { isStaff } from "@/lib/roles";
import type { LeaveBalance, LeaveRequest, LeaveType } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const statusStyle: Record<string, string> = {
  pending: "bg-amber-100 text-amber-900",
  approved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-red-100 text-red-800",
  settled: "bg-zinc-200 text-zinc-700",
};

export function LeavesPage() {
  const { user } = useAuth();
  const staff = isStaff(user?.role ?? "employee");
  const query = useApi<{ leaves: LeaveRequest[]; balances: LeaveBalance[]; labels: Record<string, string> }>("/api/leaves");
  const [type, setType] = useState<LeaveType>("cp");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (query.loading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message={query.error ?? "Erreur"} onRetry={query.reload} />;

  async function submit() {
    setSaving(true);
    try {
      await api("/api/leaves", { method: "POST", body: JSON.stringify({ type, startDate, endDate, reason }) });
      toast.success("Demande envoyée au service RH");
      setReason("");
      await query.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'envoyer");
    } finally {
      setSaving(false);
    }
  }

  async function decide(id: string, status: "approved" | "rejected") {
    try {
      await api(`/api/leaves/${id}/decide`, { method: "POST", body: JSON.stringify({ status }) });
      toast.success(status === "approved" ? "Absence validée" : "Absence refusée");
      await query.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Décision impossible");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-3xl sm:text-4xl">{staff ? "Congés & absences" : "Mes absences"}</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink/60">
          {staff
            ? "Workflow de validation comme chez PayFit : le collaborateur pose, le RH décide, la paie récupère les jours."
            : "Posez un congé. Le solde se met à jour dès validation."}
        </p>
      </div>

      <LeaveCalendar leaves={query.data.leaves} />

      <div className="grid gap-4 sm:grid-cols-2">
        {(staff ? query.data.balances.slice(0, 4) : query.data.balances).map((balance) => (
          <Card key={balance.employeeId}>
            <CardContent>
              <p className="text-sm text-ink/50">{staff ? balance.name : "Vos soldes 2026"}</p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/40">CP</p>
                  <p className="font-display text-2xl">{balance.cp.remaining} j</p>
                  <p className="text-xs text-ink/40">{balance.cp.used} posés / {balance.cp.acquired}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/40">RTT</p>
                  <p className="font-display text-2xl">{balance.rtt.remaining} j</p>
                  <p className="text-xs text-ink/40">{balance.rtt.used} posés / {balance.rtt.acquired}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!staff || user?.employeeId ? (
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
                <Label>Type</Label>
                <Select value={type} onChange={(e) => setType(e.target.value as LeaveType)}>
                  <option value="cp">Congés payés</option>
                  <option value="rtt">RTT</option>
                  <option value="maladie">Maladie</option>
                  <option value="sans_solde">Sans solde</option>
                </Select>
              </div>
              <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Début</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div>
                  <Label>Fin</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Motif</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} required />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Envoi…" : "Envoyer la demande"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
        {query.data.leaves.map((leave) => (
          <div key={leave.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/6 px-5 py-4 last:border-0">
            <div>
              <p className="font-semibold">
                {query.data?.labels[leave.type]} · {leave.days} j
                {leave.employeeName ? ` · ${leave.employeeName}` : ""}
              </p>
              <p className="text-sm text-ink/55">
                {leave.startDate} → {leave.endDate} · {leave.reason}
              </p>
              {leave.decidedAt ? (
                <p className="mt-1 text-xs text-ink/40">Décision le {new Date(leave.decidedAt).toLocaleDateString("fr-FR")}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Badge className={statusStyle[leave.status]}>{leave.status}</Badge>
              {staff && leave.status === "pending" ? (
                <>
                  <Button size="sm" onClick={() => void decide(leave.id, "approved")}>
                    Valider
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void decide(leave.id, "rejected")}>
                    Refuser
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
