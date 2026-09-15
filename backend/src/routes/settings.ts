import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../auth.js";
import { loadStore, mutate, resetStore } from "../lib/store.js";

export const settingsRouter = Router();
settingsRouter.use(requireAdmin);

settingsRouter.get("/", (_req, res) => {
  const store = loadStore();
  res.json({ settings: store.settings, rates: store.rates });
});

settingsRouter.put("/", (req, res) => {
  const parsed = z
    .object({
      companyName: z.string().min(1).optional(),
      companyCity: z.string().min(1).optional(),
      currency: z.enum(["EUR", "XOF"]).optional(),
      workingDays: z.number().positive().optional(),
      monthlyHours: z.number().positive().optional(),
      overtimeRate: z.number().positive().optional(),
      rates: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            employeeRate: z.number().min(0),
            employerRate: z.number().min(0),
            base: z.enum(["gross", "csg"]),
          }),
        )
        .optional(),
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Paramètres invalides" });
    return;
  }

  const updated = mutate((store) => {
    const { rates, ...settingsPatch } = parsed.data;
    store.settings = { ...store.settings, ...settingsPatch };
    if (rates) store.rates = rates;
    return { settings: store.settings, rates: store.rates };
  });
  res.json(updated);
});

settingsRouter.post("/reset", (_req, res) => {
  const restored = resetStore();
  res.json({ ok: true, employees: restored.employees.length, periods: restored.periods.length });
});
