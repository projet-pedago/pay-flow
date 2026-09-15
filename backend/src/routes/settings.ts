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
      companyAddress: z.string().optional(),
      companyPostalCode: z.string().optional(),
      companyCity: z.string().min(1).optional(),
      siret: z.string().optional(),
      ape: z.string().optional(),
      conventionCollective: z.string().optional(),
      paymentMethod: z.string().optional(),
      currency: z.enum(["EUR", "XOF"]).optional(),
      workingDays: z.number().positive().optional(),
      monthlyHours: z.number().positive().optional(),
      overtimeRate: z.number().positive().optional(),
      smicHourly: z.number().positive().optional(),
      fillonT: z.number().min(0).optional(),
      rates: z
        .array(
          z.object({
            id: z.string(),
            label: z.string(),
            employeeRate: z.number(),
            employerRate: z.number(),
            base: z.enum(["gross", "csg", "mutuelle"]),
            section: z.string().optional(),
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
