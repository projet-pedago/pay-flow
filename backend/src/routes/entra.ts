import { Router } from "express";
import { getUser, requireAuth } from "../auth.js";
import { graphConfigured, listPayflowEntraUsers, visibleEntraUsers, withEmployeeLinks } from "../lib/entra-graph.js";
import { loadStore } from "../lib/store.js";

export const entraRouter = Router();
entraRouter.use(requireAuth);

entraRouter.get("/users", async (req, res) => {
  const user = getUser(req);
  if (user.role === "employee") {
    res.status(403).json({ error: "Les salariés n’ont pas accès à la liste des comptes." });
    return;
  }
  if (user.role !== "admin" && user.role !== "hr") {
    res.status(403).json({ error: "Accès RH ou administrateur requis" });
    return;
  }
  if (!graphConfigured()) {
    res.status(503).json({
      error:
        "Microsoft Graph n’est pas configuré. Renseignez AZURE_GRAPH_CLIENT_ID et AZURE_GRAPH_CLIENT_SECRET (PayFlow-Provisioning, lecture seule : User.Read.All).",
    });
    return;
  }
  try {
    const raw = await listPayflowEntraUsers();
    const store = loadStore();
    const linked = withEmployeeLinks(raw, store.employees);
    const users = visibleEntraUsers(linked, user.role);
    res.json({
      source: "microsoft-graph",
      users,
    });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Lecture Entra impossible" });
  }
});
