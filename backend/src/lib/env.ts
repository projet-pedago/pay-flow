import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
const candidates = [
  join(here, "../../.env"),
  join(here, "../../../.env"),
  join(process.cwd(), ".env"),
];

for (const file of candidates) {
  if (existsSync(file)) config({ path: file, override: false });
}

export const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";

const DEFAULT_JWT_SECRET = "payrollflow-dev-secret";
const rawJwt = (process.env.JWT_SECRET ?? "").trim();
export const JWT_SECRET_IS_DEFAULT = rawJwt.length < 16;
export const JWT_SECRET = JWT_SECRET_IS_DEFAULT ? DEFAULT_JWT_SECRET : rawJwt;

if (process.env.NODE_ENV === "production" && JWT_SECRET_IS_DEFAULT) {
  throw new Error("JWT_SECRET manquant ou trop court (min. 16 caractères) en production.");
}

if (JWT_SECRET_IS_DEFAULT) {
  console.warn(
    "[PayRollFlow] JWT_SECRET absent ou trop court — secret de développement utilisé. Ne pas exposer en production. Générez-en un : openssl rand -base64 32",
  );
}

export function supabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}
