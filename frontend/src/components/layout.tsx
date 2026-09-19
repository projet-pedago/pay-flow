import { Banknote, Building2, Calculator, CalendarDays, FolderOpen, LayoutDashboard, LogOut, Menu, Network, Settings2, Sparkles, UserRound, Users, Wallet, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const adminLinks = [
  { to: "/admin", label: "Pilotage", icon: LayoutDashboard },
  { to: "/admin/utilisateurs", label: "Utilisateurs", icon: UserRound },
  { to: "/admin/employes", label: "Fiches RH", icon: Users },
  { to: "/admin/departements", label: "Départements", icon: Building2 },
  { to: "/admin/paie", label: "Cycles de paie", icon: Wallet },
  { to: "/admin/calcul", label: "Calcul bulletin", icon: Calculator },
  { to: "/admin/assistant", label: "Assistant RH", icon: Sparkles },
  { to: "/admin/reseau", label: "Réseau & factures", icon: Network },
  { to: "/admin/conges", label: "Congés", icon: CalendarDays },
  { to: "/admin/acomptes", label: "Acomptes", icon: Banknote },
  { to: "/admin/dossiers", label: "Dossiers RH", icon: FolderOpen },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings2 },
];

const hrLinks = [
  { to: "/rh", label: "Employés", icon: UserRound },
  { to: "/rh/fiches", label: "Fiches RH", icon: Users },
  { to: "/rh/departements", label: "Départements", icon: Building2 },
  { to: "/rh/conges", label: "Congés", icon: CalendarDays },
  { to: "/rh/acomptes", label: "Acomptes", icon: Banknote },
  { to: "/rh/dossiers", label: "Dossiers RH", icon: FolderOpen },
  { to: "/rh/assistant", label: "Assistant RH", icon: Sparkles },
];

function NavItems({ onClick, links, home }: { onClick?: () => void; links: typeof adminLinks; home: string }) {
  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === home}
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

export function AdminLayout({ children, variant = "admin" }: { children: ReactNode; variant?: "admin" | "hr" }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const printMode = location.pathname.includes("/bulletins/");
  const links = variant === "hr" ? hrLinks : adminLinks;
  const home = variant === "hr" ? "/rh" : "/admin";
  const title = variant === "hr" ? "Console RH" : "Console admin";
  const subtitle = variant === "hr" ? "Comptes Entra et dossiers" : "Pilotage de la masse salariale";

  if (printMode) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden bg-sage-dark text-white lg:flex lg:flex-col lg:p-5">
        <div className="mb-8 px-2">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-gold uppercase">{title}</p>
          <h1 className="font-display mt-1 text-2xl">PayRollFlow</h1>
          <p className="mt-1 text-xs text-white/60">{subtitle}</p>
        </div>
        <NavItems links={links} home={home} />
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-white/8 p-4 text-xs text-white/70">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{user?.name}</p>
              <p className="mt-1 truncate" title={user?.email}>{user?.email}</p>
            </div>
            <NotificationBell />
          </div>
          <Button variant="ghost" className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Déconnexion
          </Button>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-ink/10 bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.2em] text-sage uppercase">{variant === "hr" ? "RH" : "Admin"}</p>
            <p className="text-sm font-semibold">PayRollFlow</p>
          </div>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <Button variant="outline" size="icon" onClick={() => setOpen(true)} aria-label="Ouvrir le menu">
              <Menu className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {open ? (
          <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)}>
            <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sage-dark p-5 text-white" onClick={(event) => event.stopPropagation()}>
              <div className="mb-6 flex items-center justify-between">
                <h1 className="font-display text-xl">{variant === "hr" ? "RH" : "Admin"}</h1>
                <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavItems links={links} home={home} onClick={() => setOpen(false)} />
              <Button variant="ghost" className="mt-auto justify-start text-white/80" onClick={logout}>
                <LogOut className="h-4 w-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        ) : null}

        <main className="px-4 py-6 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
