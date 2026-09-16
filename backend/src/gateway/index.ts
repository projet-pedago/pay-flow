import "../lib/env.js";
import cors from "cors";
import express, { type Request, type RequestHandler, type Response } from "express";
import { clientIp } from "../lib/client-ip.js";

const port = Number(process.env.PORT ?? 45218);
const AUTH_URL = process.env.AUTH_URL ?? "http://127.0.0.1:45231";
const HR_URL = process.env.HR_URL ?? "http://127.0.0.1:45232";
const PAYROLL_URL = process.env.PAYROLL_URL ?? "http://127.0.0.1:45233";
const TIME_URL = process.env.TIME_URL ?? "http://127.0.0.1:45234";

function proxyTo(baseUrl: string): RequestHandler {
  return async (req, res) => {
    try {
      const url = `${baseUrl}${req.originalUrl}`;
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (!value || key === "host" || key === "content-length" || key === "connection") continue;
        headers.set(key, Array.isArray(value) ? value.join(",") : value);
      }
      const forwarded = headers.get("x-forwarded-for");
      const ip = clientIp(req);
      headers.set("x-forwarded-for", forwarded ? `${forwarded}, ${ip}` : ip);
      const init: RequestInit = { method: req.method, headers };
      if (req.method !== "GET" && req.method !== "HEAD") {
        init.body = JSON.stringify(req.body ?? {});
        headers.set("content-type", "application/json");
      }
      const upstream = await fetch(url, init);
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.status(upstream.status);
      const contentType = upstream.headers.get("content-type");
      if (contentType) res.setHeader("content-type", contentType);
      const retryAfter = upstream.headers.get("retry-after");
      if (retryAfter) res.setHeader("retry-after", retryAfter);
      const cookies = typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
      for (const cookie of cookies) res.append("set-cookie", cookie);
      res.send(buffer);
    } catch (error) {
      console.error(error);
      res.status(502).json({ error: "Service indisponible" });
    }
  };
}

const app = express();
app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  const services = await Promise.all(
    [
      ["auth", AUTH_URL],
      ["hr", HR_URL],
      ["payroll", PAYROLL_URL],
      ["time", TIME_URL],
    ].map(async ([name, url]) => {
      try {
        const response = await fetch(`${url}/api/health`);
        const body = (await response.json()) as { service?: string };
        return { name, ok: response.ok, service: body.service ?? name };
      } catch {
        return { name, ok: false, service: name };
      }
    }),
  );
  res.json({ ok: services.every((item) => item.ok), gateway: "payrollflow-gateway", services });
});

app.use("/api/auth", proxyTo(AUTH_URL));
app.use("/api/employees", proxyTo(HR_URL));
app.use("/api/departments", proxyTo(HR_URL));
app.use("/api/me/profile", proxyTo(HR_URL));
app.use("/api/me/payslips", proxyTo(PAYROLL_URL));
app.use("/api/me/summary", proxyTo(PAYROLL_URL));
app.use("/api/payroll", proxyTo(PAYROLL_URL));
app.use("/api/dashboard", proxyTo(PAYROLL_URL));
app.use("/api/settings", proxyTo(PAYROLL_URL));
app.use("/api/advances", proxyTo(PAYROLL_URL));
app.use("/api/leaves", proxyTo(TIME_URL));
app.use("/api/documents", proxyTo(TIME_URL));
app.use("/api/notifications", proxyTo(TIME_URL));

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Erreur interne" });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`payrollflow-gateway ready on http://0.0.0.0:${port}`);
});
