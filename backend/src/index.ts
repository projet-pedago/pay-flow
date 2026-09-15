import cors from "cors";
import express from "express";
import { loadStore } from "./lib/store.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { departmentsRouter } from "./routes/departments.js";
import { employeesRouter } from "./routes/employees.js";
import { payrollRouter } from "./routes/payroll.js";
import { settingsRouter } from "./routes/settings.js";

const app = express();
const port = Number(process.env.PORT ?? 45218);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  const store = loadStore();
  res.json({
    ok: true,
    service: "payrollflow-api",
    employees: store.employees.length,
    periods: store.periods.length,
  });
});

app.use("/api/employees", employeesRouter);
app.use("/api/departments", departmentsRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/settings", settingsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erreur interne" });
});

loadStore();

app.listen(port, "0.0.0.0", () => {
  console.log(`PayRollFlow API ready on http://0.0.0.0:${port}`);
});
