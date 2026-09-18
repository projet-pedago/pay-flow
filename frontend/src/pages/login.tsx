import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMsal } from "@azure/msal-react";
import { toast } from "sonner";
import { BrandLogo, TechIcon } from "@/components/brand-logo";
import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { loginRequest, microsoftConfigured } from "@/lib/msal";
import { ecosystemLogos, photos, stackLogos } from "@/lib/media";

export function LoginPage() {
  const { login } = useAuth();
  const { instance } = useMsal();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [microsoftSaving, setMicrosoftSaving] = useState(false);

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

  async function loginWithMicrosoft() {
    if (!microsoftConfigured()) {
      toast.error("Microsoft Entra ID n’est pas configuré (VITE_AZURE_CLIENT_ID / VITE_AZURE_TENANT_ID).");
      return;
    }
    setMicrosoftSaving(true);
    try {
      await instance.loginRedirect(loginRequest);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connexion Microsoft impossible");
      setMicrosoftSaving(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative hidden overflow-hidden aurora text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <img
          src={photos.office}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-25"
        />
        <div className="grid-fade absolute inset-0" />
        <FadeIn className="relative">
          <p className="text-xs font-semibold tracking-[0.28em] text-gold uppercase">ANTARES DS · bulletin officiel</p>
          <h1 className="font-display mt-4 max-w-md text-5xl">PayRollFlow</h1>
          <p className="mt-4 max-w-sm text-white/75">
            Accès nominatif. Les comptes sont créés par le service RH — il n’y a pas d’inscription en ligne.
          </p>
        </FadeIn>
        <FadeIn delay={0.12} className="relative grid gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
            <p className="text-sm font-semibold">Côté admin</p>
            <p className="mt-1 text-sm text-white/70">Masse salariale, cycles, validation, réseau et factures.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
            <p className="text-sm font-semibold">Côté collaborateur</p>
            <p className="mt-1 text-sm text-white/70">Espace personnel : bulletins, net à payer, coordonnées.</p>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">Référentiels</p>
            <div className="flex flex-wrap gap-3">
              {ecosystemLogos.map((item) => (
                <div key={item.domain} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                  <BrandLogo name={item.name} domain={item.domain} className="h-5 w-5" />
                  <span className="text-xs text-white/80">{item.name}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase">Stack</p>
            <div className="flex flex-wrap gap-2">
              {stackLogos.map((item) => (
                <div key={item.slug} className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
                  <TechIcon name={item.name} slug={item.slug} />
                  <span className="text-xs text-white/80">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </section>

      <section className="relative flex items-center bg-paper px-6 py-12 sm:px-12">
        <FadeIn className="mx-auto w-full max-w-md" delay={0.08}>
          <p className="text-xs font-semibold tracking-[0.22em] text-sage uppercase lg:hidden">PayRollFlow</p>
          <h2 className="font-display mt-2 text-4xl">Connexion</h2>
          <p className="mt-2 text-sm text-ink/55">Utilisez le compte fourni par votre administrateur. Pas d’inscription en ligne.</p>

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
            <Button className="w-full" type="submit" disabled={saving || microsoftSaving}>
              {saving ? "Connexion…" : "Entrer"}
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="text-xs text-ink/40">ou</span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={saving || microsoftSaving}
            onClick={() => void loginWithMicrosoft()}
          >
            {microsoftSaving ? "Connexion Microsoft…" : "Se connecter avec Microsoft"}
          </Button>
          <p className="mt-3 text-center text-xs text-ink/40">Connexion sécurisée avec Microsoft Entra ID</p>
        </FadeIn>
      </section>
    </div>
  );
}
