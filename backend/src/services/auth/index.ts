import "../../lib/env.js";
import { z } from "zod";
import {
  clearAuthCookie,
  getUser,
  publicUser,
  requireAuth,
  resolveSupabaseUser,
  setAuthCookie,
  signToken,
  tokenUserFromEmail,
  verifyPassword,
} from "../../auth.js";
import { createService } from "../../http.js";
import { loginRateLimit, recordLoginFailure, recordLoginSuccess } from "../../lib/rate-limit.js";
import { getSupabase } from "../../lib/supabase.js";
import { loadStore } from "../../lib/store.js";

const port = Number(process.env.PORT ?? 45231);

createService("payrollflow-auth", port, (app) => {
  app.post("/api/auth/login", loginRateLimit, async (req, res) => {
    const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Identifiants invalides" });
      return;
    }

    const supabase = getSupabase();
    if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error || !data.session?.access_token || !data.user?.email) {
        recordLoginFailure(req);
        res.status(401).json({ error: "Email ou mot de passe incorrect" });
        return;
      }
      const user =
        (await resolveSupabaseUser(data.session.access_token)) ?? (await tokenUserFromEmail(data.user.email, data.user.id));
      if (!user) {
        res.status(403).json({ error: "Compte authentifié mais non rattaché à PayRollFlow" });
        return;
      }
      recordLoginSuccess(req);
      setAuthCookie(res, signToken(user));
      res.json({ user: publicUser(user), provider: "supabase" });
      return;
    }

    const local = loadStore().users.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (!local || !verifyPassword(parsed.data.password, local.passwordHash)) {
      recordLoginFailure(req);
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }
    const tokenUser = {
      id: local.id,
      email: local.email,
      role: local.role,
      name: local.name,
      employeeId: local.employeeId,
    };
    recordLoginSuccess(req);
    setAuthCookie(res, signToken(tokenUser));
    res.json({ user: publicUser(tokenUser), provider: "local" });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(publicUser(getUser(req)));
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  });
});
