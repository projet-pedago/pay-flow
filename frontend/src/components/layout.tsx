import { Banknote, Building2, Calculator, CalendarDays, FolderOpen, LayoutDashboard, LogOut, Menu, Network, Settings2, Users, Wallet, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { to: "/admin", label: "Pilotage", icon: LayoutDashboard },
  { to: "/admin/employes", label: "Employés", icon: Users },
  { to: "/admin/departements", label: "Départements", icon: Building2 },
  { to: "/admin/paie", label: "Cycles de paie", icon: Wallet },
  { to: "/admin/calcul", label: "Calcul bulletin", icon: Calculator },
  { to: "/admin/reseau", label: "Réseau & factures", icon: Network },
  { to: "/admin/conges", label: "Congés", icon: CalendarDays },
  { to: "/admin/acomptes", label: "Acomptes", icon: Banknote },
  { to: "/admin/dossiers", label: "Dossiers RH", icon: FolderOpen },
  { to: "/admin/parametres", label: "Paramètres", icon: Settings2 },
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
            end={link.to === "/admin"}
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

export function AdminLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const printMode = location.pathname.includes("/bulletins/");

  if (printMode) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden bg-sage-dark text-white lg:flex lg:flex-col lg:p-5">
        <div className="mb-8 px-2">
          <p className="text-[11px] font-semibold tracking-[0.22em] text-gold uppercase">Console admin</p>
          <h1 className="font-display mt-1 text-2xl">PayRollFlow</h1>
          <p className="mt-1 text-xs text-white/60">Pilotage de la masse salariale</p>
        </div>
        <NavItems />
        <div className="mt-auto space-y-3">
          <div className="flex items-center justify-between rounded-2xl bg-white/8 p-4 text-xs text-white/70">
            <div>
              <p className="font-semibold text-white">{user?.name}</p>
              <p className="mt-1">{user?.email}</p>
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
            <p className="text-[10px] font-semibold tracking-[0.2em] text-sage uppercase">Admin</p>
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
                <h1 className="font-display text-xl">Admin</h1>
                <button onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fermer">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <NavItems onClick={() => setOpen(false)} />
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
