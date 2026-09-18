import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { clearMsalSession } from "@/lib/msal";

export type SessionUser = {
  id: string;
  email: string;
  role: "admin" | "hr" | "employee";
  name: string;
  employeeId: string | null;
};

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<SessionUser>;
  loginMicrosoft: (tokens: { accessToken: string; idToken?: string }) => Promise<SessionUser>;
  refresh: () => Promise<SessionUser | null>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api<SessionUser>("/api/auth/me");
      setUser(me);
      return me;
    } catch {
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refresh()
      .then(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      async login(email, password) {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        const me = await refresh();
        if (!me) throw new Error("Session introuvable après connexion");
        return me;
      },
      async loginMicrosoft(tokens) {
        await api("/api/auth/microsoft", {
          method: "POST",
          body: JSON.stringify(tokens),
        });
        const me = await refresh();
        if (!me) throw new Error("Session introuvable après connexion Microsoft");
        return me;
      },
      logout() {
        setUser(null);
        void api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        void clearMsalSession();
      },
    }),
    [user, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
