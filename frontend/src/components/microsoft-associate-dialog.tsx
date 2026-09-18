import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { directoryRoleLabel, payflowRoleLabel, payflowRoleStyle, type DirectoryRole } from "@/lib/directory";
import type { Employee } from "@/lib/types";
import { cn } from "@/lib/utils";

export type MicrosoftCandidate = {
  id: string;
  displayName: string;
  givenName: string | null;
  surname: string | null;
  userPrincipalName: string;
  mail: string | null;
  accountEnabled: boolean;
  roles: Array<"PAYFLOW_ADMIN" | "PAYFLOW_HR" | "PAYFLOW_EMPLOYEE">;
  linkedEmployeeId: string | null;
  linkedEmployeeName: string | null;
  graphFirstName: string;
  graphLastName: string;
  nameMatches: boolean;
  roleMatches: boolean;
  eligible: boolean;
  reason: string | null;
};

type CandidatesPayload = {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    directoryRole: DirectoryRole;
    jobTitle: string;
  };
  candidates: MicrosoftCandidate[];
};

export function MicrosoftAssociateDialog({
  employee,
  open,
  onOpenChange,
  onLinked,
}: {
  employee: Employee | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinked: (employee: Employee) => void;
}) {
  const [payload, setPayload] = useState<CandidatesPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [onlyMatches, setOnlyMatches] = useState(true);

  useEffect(() => {
    if (!open || !employee) {
      setPayload(null);
      setSelectedId("");
      setOnlyMatches(true);
      return;
    }
    setLoading(true);
    setError(null);
    void api<CandidatesPayload>(`/api/employees/${employee.id}/microsoft-candidates`)
      .then((data) => {
        setPayload(data);
        const preferred = data.candidates.find((item) => item.eligible && item.id === employee.entraObjectId)
          ?? data.candidates.find((item) => item.eligible);
        setSelectedId(preferred?.id ?? "");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Lecture Entra impossible"))
      .finally(() => setLoading(false));
  }, [open, employee]);

  const visible = useMemo(() => {
    const list = payload?.candidates ?? [];
    return onlyMatches ? list.filter((item) => item.nameMatches && item.roleMatches) : list;
  }, [payload, onlyMatches]);

  async function associate() {
    if (!employee || !selectedId) return;
    setSaving(true);
    try {
      const updated = await api<Employee>(`/api/employees/${employee.id}/microsoft-link`, {
        method: "PUT",
        body: JSON.stringify({ entraObjectId: selectedId }),
      });
      onLinked(updated);
      onOpenChange(false);
      toast.success(`Compte Microsoft associé à ${updated.firstName} ${updated.lastName}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Association impossible");
    } finally {
      setSaving(false);
    }
  }

  async function unlink() {
    if (!employee) return;
    setSaving(true);
    try {
      const updated = await api<Employee>(`/api/employees/${employee.id}/microsoft-link`, {
        method: "PUT",
        body: JSON.stringify({ entraObjectId: "", entraUserPrincipalName: "" }),
      });
      onLinked(updated);
      onOpenChange(false);
      toast.success("Compte Microsoft dissocié.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Dissociation impossible");
    } finally {
      setSaving(false);
    }
  }

  const fiche = payload?.employee;
  const linked = Boolean(employee?.entraObjectId || employee?.entraUserPrincipalName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Associer le compte Microsoft">
        {fiche ? (
          <div className="rounded-2xl bg-paper px-4 py-3">
            <p className="text-xs font-semibold tracking-wide text-ink/45 uppercase">Fiche PayRollFlow</p>
            <p className="mt-1 font-semibold">
              {fiche.firstName} {fiche.lastName}
            </p>
            <p className="text-sm text-ink/55">
              {directoryRoleLabel[fiche.directoryRole]} · {fiche.jobTitle}
            </p>
          </div>
        ) : null}

        {loading ? <p className="mt-4 text-sm text-ink/55">Lecture des comptes Microsoft…</p> : null}
        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

        {!loading && !error ? (
          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={onlyMatches}
                onChange={(event) => setOnlyMatches(event.target.checked)}
              />
              Uniquement les comptes dont le nom et le rôle correspondent
            </label>
            {visible.length === 0 ? (
              <p className="rounded-2xl border border-ink/10 px-4 py-8 text-center text-sm text-ink/50">
                Aucun compte Microsoft ne correspond à {fiche?.firstName} {fiche?.lastName} (
                {fiche ? directoryRoleLabel[fiche.directoryRole] : "identité"}).
              </p>
            ) : (
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {visible.map((account) => {
                  const disabled = !account.eligible;
                  return (
                    <label
                      key={account.id}
                      className={cn(
                        "flex cursor-pointer gap-3 rounded-2xl border px-4 py-3",
                        selectedId === account.id ? "border-sage bg-sage/5" : "border-ink/10",
                        disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="radio"
                        name="microsoft-account"
                        className="mt-1"
                        disabled={disabled}
                        checked={selectedId === account.id}
                        onChange={() => setSelectedId(account.id)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{account.displayName}</p>
                        <p className="truncate text-xs text-ink/50">{account.userPrincipalName}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-1">
                          {account.roles.map((role) => (
                            <Badge key={role} className={payflowRoleStyle[role]}>
                              {payflowRoleLabel[role] ?? role}
                            </Badge>
                          ))}
                          <span className={cn("text-xs", account.nameMatches ? "text-sage" : "text-red-700")}>
                            {account.nameMatches ? "✓ Nom correspondant" : "✕ Nom différent"}
                          </span>
                          <span className={cn("text-xs", account.roleMatches ? "text-sage" : "text-red-700")}>
                            {account.roleMatches ? "✓ Rôle correspondant" : "✕ Rôle différent"}
                          </span>
                        </div>
                        {account.reason ? <p className="mt-1 text-xs text-ink/45">{account.reason}</p> : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {linked ? (
            <Button variant="outline" disabled={saving} onClick={() => void unlink()}>
              Dissocier
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => void associate()} disabled={saving || !selectedId}>
            {saving ? "Association…" : "Associer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
