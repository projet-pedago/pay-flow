import { Router } from "express";
import { getUser, requireAuth } from "../auth.js";
import { loadStore, mutate } from "../lib/store.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", (req, res) => {
  const user = getUser(req);
  const items = loadStore()
    .notifications.filter((item) => {
      if (item.userId === user.id) return true;
      if (user.role === "admin" && item.userId === "role:admin") return true;
      if (user.role === "hr" && item.userId === "role:hr") return true;
      return false;
    })
    .slice(0, 40);
  res.json({
    items,
    unread: items.filter((item) => !item.read).length,
  });
});

notificationsRouter.post("/read-all", (_req, res) => {
  const user = getUser(_req);
  mutate((store) => {
    store.notifications.forEach((item) => {
      if (item.userId === user.id) item.read = true;
    });
  });
  res.json({ ok: true });
});

notificationsRouter.post("/:id/read", (req, res) => {
  const user = getUser(req);
  const updated = mutate((store) => {
    const item = store.notifications.find((entry) => entry.id === req.params.id && entry.userId === user.id);
    if (!item) return null;
    item.read = true;
    return item;
  });
  if (!updated) {
    res.status(404).json({ error: "Notification introuvable" });
    return;
  }
  res.json(updated);
});
