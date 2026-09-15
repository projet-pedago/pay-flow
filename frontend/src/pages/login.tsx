import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";

const demos = [
  {
    role: "Administrateur",
    email: "admin@payrollflow.demo",
    password: "AdminHorizon2026!",
    hint: "Pilotage RH, cycles de paie, paramètres",
  },
  {
    role: "Collaborateur — bulletin officiel",
    email: "yao.lassidan@payrollflow.demo",
    password: "Horizon2026!",
    hint: "Fiche de paie identique au bulletin Cerfa (août 2026)",
  },
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "admin" ? "/admin" : "/espace", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connexion impossible");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="relative hidden overflow-hidden bg-sage-dark text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(196,165,116,0.25),transparent_45%)]" />
        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">ANTARES DS · bulletin officiel</p>
          <h1 className="font-display mt-4 max-w-md text-5xl">PayRollFlow</h1>
          <p className="mt-4 max-w-sm text-white/70">
            Accès nominatif. Les comptes sont créés par le service RH — il n’y a pas d’inscription en ligne.
          </p>
        </div>
        <div className="relative grid gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold">Côté admin</p>
            <p className="mt-1 text-sm text-white/65">Masse salariale, cycles, validation et barèmes.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-sm font-semibold">Côté collaborateur</p>
            <p className="mt-1 text-sm text-white/65">Espace personnel : bulletins, net à payer, coordonnées.</p>
          </div>
        </div>
      </section>

      <section className="flex items-center bg-paper px-6 py-12 sm:px-12">
        <div className="mx-auto w-full max-w-md">
          <p className="text-xs font-semibold tracking-[0.22em] text-sage uppercase lg:hidden">PayRollFlow</p>
          <h2 className="font-display mt-2 text-4xl">Connexion</h2>
          <p className="mt-2 text-sm text-ink/55">Utilisez le compte fourni par votre administrateur.</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <div>
              <Label>Email professionnel</Label>
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label>Mot de passe</Label>
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <Button className="w-full" type="submit" disabled={saving}>
              {saving ? "Connexion…" : "Entrer"}
            </Button>
          </form>

          <div className="mt-8 space-y-3">
            <p className="text-xs font-semibold tracking-wide text-ink/40 uppercase">Comptes de démonstration</p>
            {demos.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => {
                  setEmail(demo.email);
                  setPassword(demo.password);
                }}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-left transition hover:border-sage/40"
              >
                <p className="text-sm font-semibold">{demo.role}</p>
                <p className="text-xs text-ink/50">{demo.email}</p>
                <p className="mt-1 text-xs text-ink/40">{demo.hint}</p>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
