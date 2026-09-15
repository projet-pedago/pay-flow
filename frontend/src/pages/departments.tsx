import { useState } from "react";
import { toast } from "sonner";
import { ErrorState, LoadingState } from "@/components/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { money } from "@/lib/format";
import type { Department, Employee, Settings } from "@/lib/types";
import { useApi } from "@/lib/use-api";

const colors = ["#0f766e", "#1d4ed8", "#7c3aed", "#c2410c", "#0f172a", "#be123c"];

export function DepartmentsPage() {
  const departments = useApi<Department[]>("/api/departments");
  const employees = useApi<Employee[]>("/api/employees");
  const settings = useApi<{ settings: Settings }>("/api/settings");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", budget: 50000, color: colors[0] });
  const [saving, setSaving] = useState(false);

  if (departments.loading) return <LoadingState />;
  if (departments.error || !departments.data) {
    return <ErrorState message={departments.error ?? "Erreur"} onRetry={departments.reload} />;
  }

  const currency = settings.data?.settings.currency ?? "EUR";

  async function createDepartment() {
    setSaving(true);
    try {
      await api("/api/departments", { method: "POST", body: JSON.stringify(form) });
      toast.success("Département créé");
      setOpen(false);
      await departments.reload();
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
          <h2 className="font-display text-3xl sm:text-4xl">Départements</h2>
          <p className="mt-2 text-sm text-ink/60">Budgets, effectifs et masse salariale de référence.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Nouveau département</Button>
          </DialogTrigger>
          <DialogContent title="Créer un département">
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void createDepartment();
              }}
            >
              <div>
                <Label>Nom</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
              </div>
              <div>
                <Label>Budget mensuel</Label>
                <Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} />
              </div>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm({ ...form, color })}
                    className="h-8 w-8 rounded-full border-2"
                    style={{ background: color, borderColor: form.color === color ? "#12241d" : "transparent" }}
                  />
                ))}
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Création…" : "Créer"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {departments.data.map((department) => {
          const members = (employees.data ?? []).filter((item) => item.departmentId === department.id);
          const payroll = members.reduce((sum, item) => sum + item.baseSalary, 0);
          const ratio = department.budget ? Math.min(payroll / department.budget, 1) : 0;
          return (
            <Card key={department.id}>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold tracking-widest text-ink/40 uppercase">{department.code}</p>
                    <h3 className="font-display text-2xl">{department.name}</h3>
                  </div>
                  <span className="h-3 w-3 rounded-full" style={{ background: department.color }} />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-ink/45">Effectif</p>
                    <p className="text-lg font-semibold">{members.length}</p>
                  </div>
                  <div>
                    <p className="text-ink/45">Brut mensuel</p>
                    <p className="text-lg font-semibold">{money(payroll, currency)}</p>
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-ink/45">
                    <span>Consommation budget</span>
                    <span>{Math.round(ratio * 100)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-paper">
                    <div className="h-full rounded-full" style={{ width: `${ratio * 100}%`, background: department.color }} />
                  </div>
                </div>
                <p className="text-xs text-ink/45">Budget {money(department.budget, currency)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
