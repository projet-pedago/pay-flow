import type { NextFunction, Request, Response } from "express";
import { clientIp } from "./client-ip.js";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

type Bucket = { failures: number; blockedUntil: number };
const buckets = new Map<string, Bucket>();

function keyFor(req: Request): string {
  const email = typeof req.body?.email === "string" ? req.body.email.toLowerCase().trim() : "";
  return `${clientIp(req)}|${email}`;
}

export function loginRateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = keyFor(req);
  const now = Date.now();
  const bucket = buckets.get(key);
  if (bucket && bucket.blockedUntil > now) {
    const retrySec = Math.max(1, Math.ceil((bucket.blockedUntil - now) / 1000));
    res.setHeader("Retry-After", String(retrySec));
    res.status(429).json({
      error: `Trop de tentatives. Réessayez dans ${Math.ceil(retrySec / 60)} min.`,
    });
    return;
  }
  next();
}

export function recordLoginFailure(req: Request): void {
  const key = keyFor(req);
  const now = Date.now();
  const bucket = buckets.get(key) ?? { failures: 0, blockedUntil: 0 };
  bucket.failures += 1;
  if (bucket.failures >= MAX_FAILURES) {
    bucket.blockedUntil = now + WINDOW_MS;
    bucket.failures = 0;
  }
  buckets.set(key, bucket);
}

export function recordLoginSuccess(req: Request): void {
  buckets.delete(keyFor(req));
}
