import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { directoryRoleLabel, payflowRoleLabel, payflowRoleStyle } from "@/lib/directory";
import { ficheBase } from "@/lib/roles";
import { useApi } from "@/lib/use-api";

export type EntraDirectoryUser = {
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
};

export function EntraUsersPage() {
  const { user } = useAuth();
  const isHr = user?.role === "hr";
  const fiches = ficheBase(isHr ? "hr" : "admin");
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
              La liste vient de Microsoft Entra ID. Un compte sans rôle PayFlow n’apparaît pas. La fiche interne se
              crée à la première connexion.
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
          <span>Fiche interne</span>
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
              <div>
                <p className="font-semibold">{account.displayName}</p>
                <p className="text-xs text-ink/45">{account.mail || "—"}</p>
              </div>
              <p className="truncate text-sm text-ink/70">{account.userPrincipalName}</p>
              <div className="flex flex-wrap gap-1">
                {account.roles.map((role) => (
                  <Badge key={role} className={payflowRoleStyle[role]}>
                    {payflowRoleLabel[role] ?? directoryRoleLabel[role === "PAYFLOW_ADMIN" ? "admin" : role === "PAYFLOW_HR" ? "hr" : "employee"]}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-ink/65">
                {account.linkedEmployeeId ? (
                  <Link to={`${fiches}/${account.linkedEmployeeId}`} className="text-sage underline">
                    {account.linkedEmployeeName}
                  </Link>
                ) : (
                  "En attente de connexion"
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
          ? "Comptes Entra PAYFLOW_EMPLOYEE. Les administrateurs n’apparaissent pas. La fiche RH se crée à leur première connexion."
          : "Tous les comptes Entra avec un rôle PayFlow. Identité unique Microsoft : aucune association manuelle."}
        {typeof count === "number" ? ` ${count} compte${count > 1 ? "s" : ""}.` : ""}
      </p>
    </div>
  );
}
