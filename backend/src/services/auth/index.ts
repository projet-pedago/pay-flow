import { z } from "zod";
import { getUser, publicUser, requireAuth, signToken, verifyPassword } from "../../auth.js";
import { createService } from "../../http.js";
import { loadStore } from "../../lib/store.js";

const port = Number(process.env.PORT ?? 45231);

createService("payrollflow-auth", port, (app) => {
  app.post("/api/auth/login", (req, res) => {
    const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Identifiants invalides" });
      return;
    }
    const user = loadStore().users.find((item) => item.email.toLowerCase() === parsed.data.email.toLowerCase());
    if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
      res.status(401).json({ error: "Email ou mot de passe incorrect" });
      return;
    }
    const tokenUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      employeeId: user.employeeId,
    };
    res.json({ token: signToken(tokenUser), user: publicUser(tokenUser) });
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(publicUser(getUser(req)));
  });

  app.post("/api/auth/logout", (_req, res) => {
    res.json({ ok: true });
  });
});
