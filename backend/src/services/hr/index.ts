import "../../lib/env.js";
import { requireAuth } from "../../auth.js";
import { createService } from "../../http.js";
import { departmentsRouter } from "../../routes/departments.js";
import { employeesRouter } from "../../routes/employees.js";
import { meProfileRouter } from "../../routes/me-profile.js";
import { networkRouter } from "../../routes/network.js";

const port = Number(process.env.PORT ?? 45232);

createService("payrollflow-hr", port, (app) => {
  app.use("/api/employees", employeesRouter);
  app.use("/api/departments", departmentsRouter);
  app.use("/api/network", networkRouter);
  app.use("/api/me", requireAuth, meProfileRouter);
});
