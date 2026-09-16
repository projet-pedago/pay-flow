import { Banknote, CalendarDays, FileText, FolderOpen, Home, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const printMode = /\/bulletins\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (printMode) {
    return <div className="min-h-screen bg-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-employee-paper text-employee">
      <header className="sticky top-0 z-30 border-b border-employee-line bg-employee-paper/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-employee-accent uppercase">Espace collaborateur</p>
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
                    cn("flex items-center gap-2 text-sm font-medium", isActive ? "text-employee" : "text-employee/55 hover:text-employee")
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
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            aria-expanded={open}
            aria-controls="employee-mobile-menu"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-40 bg-employee/40 md:hidden" onClick={() => setOpen(false)}>
          <div
            id="employee-mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navigation"
            className="absolute inset-y-0 right-0 w-72 bg-white p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <p className="font-semibold">{user?.name}</p>
              <button ref={closeRef} onClick={() => setOpen(false)} aria-label="Fermer le menu" className="rounded-md p-1">
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="grid gap-3">
              {links.map((link) => (
                <NavLink key={link.to} to={link.to} onClick={() => setOpen(false)} className="rounded-xl bg-employee-paper px-3 py-2 text-sm">
                  {link.label}
                </NavLink>
              ))}
              <Button variant="outline" onClick={logout}>
                Déconnexion
              </Button>
            </nav>
          </div>
        </div>
      ) : null}

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
