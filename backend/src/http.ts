import "./lib/env.js";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";

export function createService(name: string, port: number, setup: (app: Express) => void): void {
  const app = express();
  app.set("trust proxy", 1);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: name });
  });

  setup(app);

  app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Erreur interne" });
  });

  app.listen(port, "0.0.0.0", () => {
    console.log(`${name} ready on http://0.0.0.0:${port}`);
  });
}
