import { Building2, LayoutDashboard, Menu, Settings2, Users, Wallet, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const links = [
  { to: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/employes", label: "Employés", icon: Users },
  { to: "/departements", label: "Départements", icon: Building2 },
  { to: "/paie", label: "Cycles de paie", icon: Wallet },
  { to: "/parametres", label: "Paramètres", icon: Settings2 },
];

function NavItems({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            onClick={onClick}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
                isActive ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const printMode = location.pathname.startsWith("/bulletins/");

  if (printMode) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden bg-sage-dark text-white lg:flex lg:flex-col lg:p-5">
        <div className="mb-8 px-2">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-gold uppercase">DevOps Azure</p>
          <h1 className="font-display mt-1 text-2xl">PayRollFlow</h1>
          <p className="mt-1 text-xs text-white/60">Pilotage de la masse salariale</p>
        </div>
        <NavItems />
        <div className="mt-auto rounded-2xl bg-white/8 p-4 text-xs text-white/70">
          Jeu de données de démonstration. Les bulletins se recalculent à chaque cycle.
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/10 bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-sage uppercase">PayRollFlow</p>
            <p className="text-sm font-semibold">Gestion de paie</p>
          </div>
          <Button variant="outline" size="icon" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-4 w-4" />
          </Button>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
            <div
              className="absolute inset-y-0 left-0 w-72 bg-sage-dark p-5 text-white"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mb-6 flex items-center justify-between">
                <h1 className="font-display text-xl">PayRollFlow</h1>
                <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavItems onClick={() => setOpen(false)} />
            </div>
          </div>
        ) : null}

        <main className="px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
