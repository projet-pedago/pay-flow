import "../../lib/env.js";
import { z } from "zod";
import {
  clearAuthCookie,
  getUser,
  publicUser,
  requireAuth,
  setAuthCookie,
  signToken,
} from "../../auth.js";
import { createService } from "../../http.js";
import { loginRateLimit, recordLoginFailure, recordLoginSuccess } from "../../lib/rate-limit.js";
import { azureConfigured, verifyMicrosoftTokens } from "../../lib/azure.js";
import { provisionMicrosoftProfile } from "../../lib/entra-link.js";

const port = Number(process.env.PORT ?? 45231);

createService("payrollflow-auth", port, (app) => {
  app.post("/api/auth/login", loginRateLimit, (_req, res) => {
    res.status(410).json({ error: "La connexion se fait uniquement avec Microsoft Entra ID." });
  });

  app.post("/api/auth/microsoft", loginRateLimit, async (req, res) => {
    if (!azureConfigured()) {
      res.status(503).json({ error: "Microsoft Entra ID n’est pas configuré" });
      return;
    }
    const parsed = z
      .object({
        accessToken: z.string().min(20).optional(),
        idToken: z.string().min(20).optional(),
      })
      .refine((value) => Boolean(value.accessToken || value.idToken))
      .safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Jeton Microsoft manquant" });
      return;
    }
    try {
      const profile = await verifyMicrosoftTokens(parsed.data);

      const allowedRoles = ["PAYFLOW_ADMIN", "PAYFLOW_HR", "PAYFLOW_EMPLOYEE"] as const;
      const entraRole = allowedRoles.find((role) => profile.roles.includes(role));

      if (!entraRole) {
        recordLoginFailure(req);
        res.status(403).json({
          error: "Votre compte Microsoft est authentifié mais aucun rôle PayFlow ne lui a été attribué.",
        });
        return;
      }

      let role: "admin" | "hr" | "employee";
      switch (entraRole) {
        case "PAYFLOW_ADMIN":
          role = "admin";
          break;
        case "PAYFLOW_HR":
          role = "hr";
          break;
        case "PAYFLOW_EMPLOYEE":
          role = "employee";
          break;
        default:
          recordLoginFailure(req);
          res.status(403).json({ error: "Rôle PayFlow non autorisé." });
          return;
      }

      const oid = profile.oid || profile.sub;
      const fiche = provisionMicrosoftProfile({
        oid,
        email: profile.email,
        name: profile.name,
        givenName: profile.givenName,
        familyName: profile.familyName,
        role,
      });

      const user = {
        id: oid,
        email: profile.email,
        name: profile.name,
        role,
        employeeId: fiche?.id,
      };

      recordLoginSuccess(req);
      setAuthCookie(res, signToken(user));
      res.json({
        user: publicUser(user),
        provider: "microsoft",
      });
    } catch (error) {
      recordLoginFailure(req);
      res.status(401).json({ error: error instanceof Error ? error.message : "Jeton Microsoft refusé" });
    }
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json(publicUser(getUser(req)));
  });

  app.post("/api/auth/logout", (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  });
});
