import { Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { MicrosoftAssociateDialog } from "@/components/microsoft-associate-dialog";
import { ErrorState, LoadingState } from "@/components/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { directoryRoleLabel, directoryRoleOf, payflowRoleLabel, payflowRoleStyle, type DirectoryRole } from "@/lib/directory";
import { ficheBase } from "@/lib/roles";
import type { Department, Employee } from "@/lib/types";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";

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

type IdentityDraft = {
  firstName: string;
  lastName: string;
  directoryRole: DirectoryRole;
  email: string;
  jobTitle: string;
  departmentId: string;
  contractType: "CDI" | "CDD" | "Stage" | "Alternance";
  baseSalary: number;
};

const emptyIdentity = (): IdentityDraft => ({
  firstName: "",
  lastName: "",
  directoryRole: "employee",
  email: "",
  jobTitle: "",
  departmentId: "",
  contractType: "CDI",
  baseSalary: 3500,
});

export function EntraUsersPage() {
  const { user } = useAuth();
  const isHr = user?.role === "hr";
  const isAdmin = user?.role === "admin";
  const fiches = ficheBase(isHr ? "hr" : "admin");
  const entraQuery = useApi<{ users: EntraDirectoryUser[]; source: string }>("/api/entra/users");
  const identitiesQuery = useApi<Employee[]>(isAdmin ? "/api/employees?scope=directory" : "/api/employees");
  const departments = useApi<Department[]>("/api/departments");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<IdentityDraft>(emptyIdentity);
  const [saving, setSaving] = useState(false);
  const [associate, setAssociate] = useState<Employee | null>(null);

  const identities = identitiesQuery.data ?? [];
  const accounts = entraQuery.data?.users ?? [];

  const loading = entraQuery.loading || identitiesQuery.loading;
  const error = entraQuery.error ?? identitiesQuery.error;

  async function createIdentity() {
    setSaving(true);
    try {
      const body =
        draft.directoryRole === "employee"
          ? {
              ...draft,
              phone: "n/c",
              hireDate: new Date().toISOString().slice(0, 10),
              status: "active",
              iban: "FR76 A COMPLETER",
              city: "Paris",
              country: "France",
            }
          : {
              firstName: draft.firstName,
              lastName: draft.lastName,
              directoryRole: draft.directoryRole,
            };
      const created = await api<Employee>("/api/employees", { method: "POST", body: JSON.stringify(body) });
      toast.success(`Identité ${created.firstName} ${created.lastName} créée. Associez maintenant le compte Microsoft correspondant.`);
      setCreateOpen(false);
      setDraft(emptyIdentity());
      await identitiesQuery.reload();
      setAssociate(created);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Création impossible");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState label="Lecture des identités et des comptes Entra…" />;
  if (error) {
    return (
      <div className="space-y-4">
        <Header hr={isHr} />
        <ErrorState message={error} onRetry={() => void Promise.all([entraQuery.reload(), identitiesQuery.reload()])} />
        <Card>
          <CardContent className="flex items-start gap-3 text-sm text-ink/70">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-ink/40" />
            <p>
              Seuls les utilisateurs auxquels un rôle PayFlow a été attribué dans l’application entreprise
              apparaissent ici.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <Header hr={isHr} count={isAdmin ? identities.length : accounts.length} />
        {isAdmin ? (
          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (open) {
                setDraft({
                  ...emptyIdentity(),
                  departmentId: departments.data?.[0]?.id ?? "",
                });
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" />
                Créer une identité
              </Button>
            </DialogTrigger>
            <DialogContent title="Créer une identité PayRollFlow">
              <IdentityForm
                draft={draft}
                departments={departments.data ?? []}
                onChange={setDraft}
                onSubmit={() => void createIdentity()}
                saving={saving}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {isAdmin ? (
        <section className="space-y-3">
          <h3 className="font-display text-2xl">Identités PayRollFlow</h3>
          <p className="text-sm text-ink/55">
            Le prénom, le nom et le type (Admin, RH ou Employé) doivent coïncider avec le compte Microsoft au moment de l’association.
          </p>
          <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
            <div className="hidden grid-cols-[2fr_1fr_1.2fr_1fr_auto] gap-4 border-b border-ink/8 px-5 py-3 text-xs font-semibold tracking-wide text-ink/45 uppercase md:grid">
              <span>Identité</span>
              <span>Type</span>
              <span>Compte Microsoft</span>
              <span>Statut</span>
              <span></span>
            </div>
            {identities.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-ink/50">Aucune identité n’a encore été créée.</p>
            ) : (
              identities.map((identity) => {
                const role = directoryRoleOf(identity.directoryRole);
                return (
                  <div
                    key={identity.id}
                    className="grid gap-2 border-b border-ink/6 px-5 py-4 last:border-b-0 md:grid-cols-[2fr_1fr_1.2fr_1fr_auto] md:items-center"
                  >
                    <div>
                      <p className="font-semibold">
                        {identity.firstName} {identity.lastName}
                      </p>
                      <p className="text-xs text-ink/50">{identity.jobTitle}</p>
                    </div>
                    <Badge className={payflowRoleStyle[role === "admin" ? "PAYFLOW_ADMIN" : role === "hr" ? "PAYFLOW_HR" : "PAYFLOW_EMPLOYEE"]}>
                      {directoryRoleLabel[role]}
                    </Badge>
                    <p className="truncate text-sm text-ink/65">
                      {identity.entraUserPrincipalName || "Non associé"}
                    </p>
                    <span className={cn("text-xs", identity.entraObjectId ? "text-sage" : "text-ink/40")}>
                      {identity.entraObjectId ? "Lié" : identity.entraUserPrincipalName ? "En attente" : "Non associé"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {role === "employee" ? (
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`${fiches}/${identity.id}`}>Modifier</Link>
                        </Button>
                      ) : null}
                      <Button size="sm" onClick={() => setAssociate(identity)}>
                        {identity.entraObjectId ? "Compte Microsoft" : "Associer un compte Microsoft"}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="font-display text-2xl">{isHr ? "Comptes employés Microsoft" : "Comptes Microsoft Entra"}</h3>
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white">
          <div className="hidden grid-cols-[2fr_1.6fr_1fr_1fr_auto] gap-4 border-b border-ink/8 px-5 py-3 text-xs font-semibold tracking-wide text-ink/45 uppercase md:grid">
            <span>Compte Microsoft</span>
            <span>UPN Entra</span>
            <span>Rôle PayFlow</span>
            <span>Identité</span>
            <span>Statut</span>
          </div>
          {accounts.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-ink/50">
              Aucun compte PayFlow n’est encore attribué dans Entra ID.
            </p>
          ) : (
            accounts.map((account) => (
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
                      {payflowRoleLabel[role] ?? role}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-ink/65">
                  {account.linkedEmployeeId ? (
                    <Link to={`${fiches}/${account.linkedEmployeeId}`} className="text-sage underline">
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
      </section>

      <MicrosoftAssociateDialog
        employee={associate}
        open={Boolean(associate)}
        onOpenChange={(open) => {
          if (!open) setAssociate(null);
        }}
        onLinked={async () => {
          await Promise.all([identitiesQuery.reload(), entraQuery.reload()]);
        }}
      />
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
          ? "Comptes Entra PAYFLOW_EMPLOYEE et fiches associées. Vous consultez les dossiers, sans modifier l’association Microsoft."
          : "Créez l’identité PayRollFlow (prénom, nom, type) puis associez uniquement le compte Microsoft au nom et au rôle identiques."}
        {typeof count === "number" ? ` ${count} élément${count > 1 ? "s" : ""}.` : ""}
      </p>
    </div>
  );
}

function IdentityForm({
  draft,
  departments,
  onChange,
  onSubmit,
  saving,
}: {
  draft: IdentityDraft;
  departments: Department[];
  onChange: (value: IdentityDraft) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  function set<K extends keyof IdentityDraft>(key: K, value: IdentityDraft[K]) {
    onChange({ ...draft, [key]: value });
  }
  const employee = draft.directoryRole === "employee";

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <Label>Prénom</Label>
        <Input value={draft.firstName} onChange={(event) => set("firstName", event.target.value)} required />
      </div>
      <div>
        <Label>Nom</Label>
        <Input value={draft.lastName} onChange={(event) => set("lastName", event.target.value)} required />
      </div>
      <div className="sm:col-span-2">
        <Label>Type d’identité</Label>
        <Select value={draft.directoryRole} onChange={(event) => set("directoryRole", event.target.value as DirectoryRole)}>
          <option value="employee">Employé — espace collaborateur</option>
          <option value="hr">RH — console /rh</option>
          <option value="admin">Admin — console /admin</option>
        </Select>
      </div>
      {employee ? (
        <>
          <div>
            <Label>Email professionnel</Label>
            <Input type="email" value={draft.email} onChange={(event) => set("email", event.target.value)} required />
          </div>
          <div>
            <Label>Poste</Label>
            <Input value={draft.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} required />
          </div>
          <div>
            <Label>Département</Label>
            <Select value={draft.departmentId} onChange={(event) => set("departmentId", event.target.value)} required>
              <option value="">Choisir…</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Contrat</Label>
            <Select
              value={draft.contractType}
              onChange={(event) => set("contractType", event.target.value as IdentityDraft["contractType"])}
            >
              <option>CDI</option>
              <option>CDD</option>
              <option>Stage</option>
              <option>Alternance</option>
            </Select>
          </div>
          <div>
            <Label>Salaire brut mensuel</Label>
            <Input
              type="number"
              min={1}
              value={draft.baseSalary}
              onChange={(event) => set("baseSalary", Number(event.target.value))}
              required
            />
          </div>
        </>
      ) : (
        <p className="sm:col-span-2 text-sm text-ink/55">
          Pour un Admin ou un RH, seuls le prénom, le nom et le type sont nécessaires. L’association Microsoft devra
          viser un compte au même nom avec le rôle {draft.directoryRole === "admin" ? "PAYFLOW_ADMIN" : "PAYFLOW_HR"}.
        </p>
      )}
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? "Création…" : "Créer l’identité"}
        </Button>
      </div>
    </form>
  );
}
