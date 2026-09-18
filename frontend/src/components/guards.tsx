import { Navigate, useLocation } from "react-router-dom";
import { LoadingState } from "@/components/states";
import { useAuth } from "@/lib/auth";
import { homePath, type UserRole } from "@/lib/roles";
import type { ReactNode } from "react";

export function RequireAuth({
  role,
  children,
}: {
  role?: UserRole | UserRole[];
  children: ReactNode;
}) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingState label="Vérification de la session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  const allowed = role ? (Array.isArray(role) ? role : [role]) : null;
  if (allowed && !allowed.includes(user.role)) {
    return <Navigate to={homePath(user.role)} replace />;
  }
  return children;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (user) return <Navigate to={homePath(user.role)} replace />;
  return children;
}

export function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePath(user.role)} replace />;
}
