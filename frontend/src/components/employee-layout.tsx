import { Banknote, CalendarDays, FileText, FolderOpen, Home, LogOut, Menu, UserRound, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NotificationBell } from "@/components/notification-bell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { to: "/espace", label: "Accueil", icon: Home },
  { to: "/espace/bulletins", label: "Mes bulletins", icon: FileText },
  { to: "/espace/conges", label: "Congés", icon: CalendarDays },
  { to: "/espace/acomptes", label: "Acomptes", icon: Banknote },
  { to: "/espace/dossier", label: "Dossier", icon: FolderOpen },
  { to: "/espace/profil", label: "Profil", icon: UserRound },
];

export function EmployeeLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const printMode = /\/bulletins\/[^/]+$/.test(location.pathname);

  if (printMode) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-[#eef3f8] text-[#16324f]">
      <header className="sticky top-0 z-30 border-b border-[#d5e0ea] bg-[#eef3f8]/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#3d7ea6] uppercase">Espace collaborateur</p>
            <p className="font-display text-xl">PayRollFlow</p>
          </div>
          <div className="hidden items-center gap-5 md:flex">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === "/espace"}
                  className={({ isActive }) =>
                    cn("flex items-center gap-2 text-sm font-medium", isActive ? "text-[#16324f]" : "text-[#16324f]/55 hover:text-[#16324f]")
                  }
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </NavLink>
              );
            })}
            <NotificationBell variant="employee" />
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Sortir
            </Button>
          </div>
          <Button variant="outline" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Menu">
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 bg-[#16324f]/40 md:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-y-0 right-0 w-72 bg-white p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <p className="font-semibold">{user?.name}</p>
              <button onClick={() => setOpen(false)} aria-label="Fermer">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className="rounded-xl bg-[#eef3f8] px-3 py-2 text-sm">
                  {link.label}
                </NavLink>
              ))}
              <Button variant="outline" onClick={logout}>
                Déconnexion
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
