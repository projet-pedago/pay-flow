import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { clearMsalSession } from "@/lib/msal";

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
  loginMicrosoft: (tokens: { accessToken: string; idToken?: string }) => Promise<SessionUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void api<SessionUser>("/api/auth/me")
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        await api("/api/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        const me = await api<SessionUser>("/api/auth/me");
        setUser(me);
        return me;
      },
      async loginMicrosoft(tokens) {
        await api("/api/auth/microsoft", {
          method: "POST",
          body: JSON.stringify(tokens),
        });
        const me = await api<SessionUser>("/api/auth/me");
        setUser(me);
        return me;
      },
      logout() {
        setUser(null);
        void api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
        void clearMsalSession();
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
