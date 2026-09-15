import { requireAuth } from "../../auth.js";
import { createService } from "../../http.js";
import { documentsRouter } from "../../routes/documents.js";
import { leavesRouter } from "../../routes/leaves.js";
import { notificationsRouter } from "../../routes/notifications.js";

const port = Number(process.env.PORT ?? 45234);

createService("payrollflow-time", port, (app) => {
  app.use("/api/leaves", leavesRouter);
  app.use("/api/documents", documentsRouter);
  app.use("/api/notifications", notificationsRouter);
});
