import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { api } from "@/lib/api";
import { percent } from "@/lib/format";
import type { ContributionRate, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

export function SettingsPage() {
  const { data, error, loading, reload } = useApi<{ settings: Settings; rates: ContributionRate[] }>("/api/settings");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rates, setRates] = useState<ContributionRate[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setSettings(data.settings);
    setRates(data.rates);
  }, [data]);

  if (loading) return <LoadingState />;
  if (error || !settings) return <ErrorState message={error ?? "Paramètres indisponibles"} onRetry={reload} />;

  async function save() {
    setSaving(true);
    try {
      await api("/api/settings", { method: "PUT", body: JSON.stringify({ ...settings, rates }) });
      toast.success("Paramètres enregistrés");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  }

  async function resetDemo() {
    if (!confirm("Réinitialiser le jeu de données de démonstration ?")) return;
    await api("/api/settings/reset", { method: "POST" });
    toast.success("Données de démo restaurées");
    window.location.href = "/";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Paramètres</h2>
          <p className="mt-2 text-sm text-ink/60">Identité employeur du bulletin officiel, devise et barème de cotisations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void resetDemo()}>
            Réinitialiser la démo
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-display text-xl">Société</h3>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Nom</Label>
            <Input value={settings.companyName} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
          </div>
          <div>
            <Label>Adresse</Label>
            <Input value={settings.companyAddress ?? ""} onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })} />
          </div>
          <div>
            <Label>Code postal</Label>
            <Input value={settings.companyPostalCode ?? ""} onChange={(e) => setSettings({ ...settings, companyPostalCode: e.target.value })} />
          </div>
          <div>
            <Label>Ville</Label>
            <Input value={settings.companyCity} onChange={(e) => setSettings({ ...settings, companyCity: e.target.value })} />
          </div>
          <div>
            <Label>SIRET</Label>
            <Input value={settings.siret ?? ""} onChange={(e) => setSettings({ ...settings, siret: e.target.value })} />
          </div>
          <div>
            <Label>APE / NAF</Label>
            <Input value={settings.ape ?? ""} onChange={(e) => setSettings({ ...settings, ape: e.target.value })} />
          </div>
          <div>
            <Label>Convention collective</Label>
            <Input value={settings.conventionCollective ?? ""} onChange={(e) => setSettings({ ...settings, conventionCollective: e.target.value })} />
          </div>
          <div>
            <Label>Mode de paiement</Label>
            <Input value={settings.paymentMethod ?? ""} onChange={(e) => setSettings({ ...settings, paymentMethod: e.target.value })} />
          </div>
          <div>
            <Label>Devise</Label>
            <Select
              value={settings.currency}
              onChange={(e) => setSettings({ ...settings, currency: e.target.value as Settings["currency"] })}
            >
              <option value="EUR">Euro (EUR)</option>
              <option value="XOF">Franc CFA (XOF)</option>
            </Select>
          </div>
          <div>
            <Label>Jours ouvrés / mois</Label>
            <Input type="number" value={settings.workingDays} onChange={(e) => setSettings({ ...settings, workingDays: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Heures mensuelles</Label>
            <Input type="number" value={settings.monthlyHours} onChange={(e) => setSettings({ ...settings, monthlyHours: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Majoration HS</Label>
            <Input type="number" step="0.05" value={settings.overtimeRate} onChange={(e) => setSettings({ ...settings, overtimeRate: Number(e.target.value) })} />
          </div>
          <div>
            <Label>SMIC horaire</Label>
            <Input type="number" step="0.01" value={settings.smicHourly ?? 11.88} onChange={(e) => setSettings({ ...settings, smicHourly: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Coeff. réduction générale</Label>
            <Input type="number" step="0.0001" value={settings.fillonT ?? 0.3195} onChange={(e) => setSettings({ ...settings, fillonT: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="font-display text-xl">Barème de cotisations</h3>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink/45">
                <th className="pb-3">Libellé</th>
                <th className="pb-3">Base</th>
                <th className="pb-3">Salarié</th>
                <th className="pb-3">Employeur</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate, index) => (
                <tr key={rate.id} className="border-t border-ink/8">
                  <td className="py-2">
                    <Input
                      value={rate.label}
                      onChange={(e) =>
                        setRates(rates.map((item, i) => (i === index ? { ...item, label: e.target.value } : item)))
                      }
                    />
                  </td>
                  <td className="py-2">{rate.base === "csg" ? "CSG (98,25%)" : rate.base === "mutuelle" ? "Mutuelle" : "Brut"}</td>
                  <td className="py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={rate.employeeRate}
                      onChange={(e) =>
                        setRates(rates.map((item, i) => (i === index ? { ...item, employeeRate: Number(e.target.value) } : item)))
                      }
                    />
                    <p className="mt-1 text-xs text-ink/40">{percent(rate.employeeRate)}</p>
                  </td>
                  <td className="py-2">
                    <Input
                      type="number"
                      step="0.001"
                      value={rate.employerRate}
                      onChange={(e) =>
                        setRates(rates.map((item, i) => (i === index ? { ...item, employerRate: Number(e.target.value) } : item)))
                      }
                    />
                    <p className="mt-1 text-xs text-ink/40">{percent(rate.employerRate)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
