import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { EmployeeBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Department, Employee, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

type Payload = { employee: Employee; department?: Department; settings: Settings };

export function EmployeeProfilePage() {
  const query = useApi<Payload>("/api/me/profile");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [iban, setIban] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!query.data) return;
    setPhone(query.data.employee.phone);
    setCity(query.data.employee.city);
    setCountry(query.data.employee.country);
    setIban(query.data.employee.iban);
  }, [query.data]);

  if (query.loading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message={query.error ?? "Profil introuvable"} onRetry={query.reload} />;

  const { employee, department, settings } = query.data;

  async function save() {
    setSaving(true);
    try {
      await api("/api/me/profile", { method: "PUT", body: JSON.stringify({ phone, city, country, iban }) });
      toast.success("Coordonnées mises à jour");
      await query.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-4xl text-employee">
          {employee.firstName} {employee.lastName}
        </h2>
        <div className="mt-2 flex items-center gap-2">
          <EmployeeBadge status={employee.status} />
          <span className="text-sm text-employee/60">{employee.jobTitle}</span>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="rounded-3xl border-employee-line shadow-none">
          <CardContent className="space-y-1 text-sm">
            <p className="text-employee/45">Contrat</p>
            <p className="font-semibold">{employee.contractType} depuis {employee.hireDate}</p>
            <p className="text-employee/45">Département</p>
            <p className="font-semibold">{department?.name ?? "—"}</p>
            <p className="text-employee/45">Salaire de base</p>
            <p className="font-semibold">{money(employee.baseSalary, settings.currency)} / mois</p>
            <p className="text-employee/45">Matricule</p>
            <p className="font-semibold">{employee.matricule || "—"}</p>
            <p className="text-xs text-employee/40">Le salaire n’est modifiable que par un administrateur.</p>
          </CardContent>
        </Card>
        <Card className="rounded-3xl border-employee-line shadow-none">
          <CardContent className="grid gap-3">
            <div>
              <Label>Téléphone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div>
              <Label>Ville</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label>Pays</Label>
              <Input value={country} onChange={(e) => setCountry(e.target.value)} />
            </div>
            <div>
              <Label>IBAN</Label>
              <Input value={iban} onChange={(e) => setIban(e.target.value)} />
            </div>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Sauvegarde…" : "Enregistrer mes coordonnées"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
