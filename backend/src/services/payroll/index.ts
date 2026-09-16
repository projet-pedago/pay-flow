import "../../lib/env.js";
import { requireAuth } from "../../auth.js";
import { createService } from "../../http.js";
import { advancesRouter } from "../../routes/advances.js";
import { assistantRouter } from "../../routes/assistant.js";
import { dashboardRouter } from "../../routes/dashboard.js";
import { mePayrollRouter } from "../../routes/me-payroll.js";
import { payrollRouter } from "../../routes/payroll.js";
import { settingsRouter } from "../../routes/settings.js";

const port = Number(process.env.PORT ?? 45233);

createService("payrollflow-payroll", port, (app) => {
  app.use("/api/payroll", payrollRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/settings", settingsRouter);
  app.use("/api/advances", advancesRouter);
  app.use("/api/assistant", assistantRouter);
  app.use("/api/me", requireAuth, mePayrollRouter);
});
