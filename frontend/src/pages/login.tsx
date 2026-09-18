import { useState } from "react";
import { useMsal } from "@azure/msal-react";
import { toast } from "sonner";
import { BrandLogo, TechIcon } from "@/components/brand-logo";
import { FadeIn } from "@/components/fade-in";
import { Button } from "@/components/ui/button";
import { loginRequest } from "@/lib/msal";
import { ecosystemLogos, photos, stackLogos } from "@/lib/media";

export function LoginPage() {
  const { instance } = useMsal();
  const [microsoftSaving, setMicrosoftSaving] = useState(false);

  async function loginWithMicrosoft() {
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
            Les comptes se créent dans Microsoft Entra ID. Seuls les rôles PayFlow (Admin, RH, Employé) ouvrent l’application.
          </p>
        </FadeIn>
        <FadeIn delay={0.12} className="relative grid gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
            <p className="text-sm font-semibold">Côté admin</p>
            <p className="mt-1 text-sm text-white/70">Tous les comptes PayFlow Entra : Admin, RH et Employés.</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur-sm">
            <p className="text-sm font-semibold">Côté RH</p>
            <p className="mt-1 text-sm text-white/70">Uniquement les comptes Entra PAYFLOW_EMPLOYEE.</p>
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
        </FadeIn>
      </section>

      <section className="relative flex items-center bg-paper px-6 py-12 sm:px-12">
        <FadeIn className="mx-auto w-full max-w-md" delay={0.08}>
          <p className="text-xs font-semibold tracking-[0.22em] text-sage uppercase lg:hidden">PayRollFlow</p>
          <h2 className="font-display mt-2 text-4xl">Connexion</h2>
          <p className="mt-2 text-sm text-ink/55">
            Uniquement Microsoft Entra ID. Pas de compte de démonstration, pas d’inscription en ligne.
          </p>
          <Button
            type="button"
            className="mt-8 w-full"
            disabled={microsoftSaving}
            onClick={() => void loginWithMicrosoft()}
          >
            {microsoftSaving ? "Connexion Microsoft…" : "Se connecter avec Microsoft"}
          </Button>
          <p className="mt-3 text-center text-xs text-ink/40">PAYFLOW_ADMIN · PAYFLOW_HR · PAYFLOW_EMPLOYEE</p>
        </FadeIn>
      </section>
    </div>
  );
}
