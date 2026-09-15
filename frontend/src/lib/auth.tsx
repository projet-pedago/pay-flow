import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken as persistToken } from "@/lib/api";

export type SessionUser = {
  id: string;
  email: string;
  role: "admin" | "employee";
  name: string;
  employeeId: string | null;
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      if (!getToken()) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        const me = await api<SessionUser>("/api/auth/me");
        if (!cancelled) setUser(me);
      } catch {
        persistToken(null);
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const result = await api<{ token: string; user: SessionUser }>("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        persistToken(result.token);
        setUser(result.user);
        return result.user;
      },
      logout() {
        persistToken(null);
        setUser(null);
        void api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
