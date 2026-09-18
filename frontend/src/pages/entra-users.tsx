import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { staffBase } from "@/lib/roles";
import { useApi } from "@/lib/use-api";

export type EntraDirectoryUser = {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string | null;
  accountEnabled: boolean;
  roles: Array<"PAYFLOW_ADMIN" | "PAYFLOW_HR" | "PAYFLOW_EMPLOYEE">;
  linkedEmployeeId: string | null;
  linkedEmployeeName: string | null;
};

const roleLabel: Record<string, string> = {
  PAYFLOW_ADMIN: "Admin",
  PAYFLOW_HR: "RH",
  PAYFLOW_EMPLOYEE: "Employé",
};

const roleStyle: Record<string, string> = {
  PAYFLOW_ADMIN: "bg-ink text-white",
  PAYFLOW_HR: "bg-sage/15 text-sage",
  PAYFLOW_EMPLOYEE: "bg-amber-100 text-amber-900",
};

export function EntraUsersPage() {
  const { user } = useAuth();
  const isHr = user?.role === "hr";
  const base = staffBase(isHr ? "hr" : "admin");
  const query = useApi<{ users: EntraDirectoryUser[]; source: string }>("/api/entra/users");

  if (query.loading) return <LoadingState label="Lecture des comptes Entra…" />;
  if (query.error) {
    return (
      <div className="space-y-4">
        <Header hr={isHr} />
        <ErrorState message={query.error} onRetry={query.reload} />
        <Card>
          <CardContent className="flex items-start gap-3 text-sm text-ink/70">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink/40" />
            <p>
              Seuls les utilisateurs auxquels un rôle PayFlow a été attribué dans l’application entreprise
              apparaissent ici. Un compte Microsoft sans <code>PAYFLOW_ADMIN</code>, <code>PAYFLOW_HR</code> ou{" "}
              <code>PAYFLOW_EMPLOYEE</code> reste invisible.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const users = query.data?.users ?? [];

  return (
    <div className="space-y-6">
      <Header hr={isHr} count={users.length} />

      <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
        <div className="hidden grid-cols-[2fr_1.6fr_1fr_1fr_auto] gap-4 border-b border-ink/8 px-5 py-3 text-xs font-semibold tracking-wide text-ink/45 uppercase md:grid">
          <span>Compte Microsoft</span>
          <span>UPN Entra</span>
          <span>Rôle PayFlow</span>
          <span>Fiche RH</span>
          <span>Statut</span>
        </div>
        {users.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-ink/50">
            Aucun compte PayFlow n’est encore attribué dans Entra ID.
          </p>
        ) : (
          users.map((account) => (
            <div
              key={account.id}
              className="grid gap-2 border-b border-ink/6 px-5 py-4 last:border-b-0 md:grid-cols-[2fr_1.6fr_1fr_1fr_auto] md:items-center"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-dark text-xs font-semibold text-white">
                  {initials(account.displayName)}
                </div>
                <div>
                  <p className="font-semibold">{account.displayName}</p>
                  <p className="text-xs text-ink/45">{account.mail || "—"}</p>
                </div>
              </div>
              <p className="truncate text-sm text-ink/70">{account.userPrincipalName}</p>
              <div className="flex flex-wrap gap-1">
                {account.roles.map((role) => (
                  <Badge key={role} className={roleStyle[role]}>
                    {roleLabel[role] ?? role}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-ink/65">
                {account.linkedEmployeeId ? (
                  <Link to={`${isHr ? `${base}/fiches` : `${base}/employes`}/${account.linkedEmployeeId}`} className="text-sage underline">
                    {account.linkedEmployeeName}
                  </Link>
                ) : (
                  "Non lié"
                )}
              </p>
              <span className={`text-xs ${account.accountEnabled ? "text-sage" : "text-ink/40"}`}>
                {account.accountEnabled ? "Actif" : "Désactivé"}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Header({ hr, count }: { hr: boolean; count?: number }) {
  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.2em] text-ink/40 uppercase">Microsoft Entra ID</p>
      <h2 className="font-display mt-1 text-3xl sm:text-4xl">{hr ? "Employés" : "Utilisateurs"}</h2>
      <p className="mt-2 max-w-2xl text-sm text-ink/60">
        {hr
          ? "Comptes Entra auxquels le rôle PAYFLOW_EMPLOYEE a été attribué. Les administrateurs et les RH n’apparaissent pas ici."
          : "Tous les comptes Entra auxquels un rôle PayFlow a été attribué : Admin, RH et Employés."}
        {typeof count === "number" ? ` ${count} compte${count > 1 ? "s" : ""}.` : ""}
      </p>
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase() || "?";
}
