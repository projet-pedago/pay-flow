import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getSupabase } from "./lib/supabase.js";
import type { Role } from "./types.js";

const SECRET = process.env.JWT_SECRET ?? "payrollflow-dev-secret";

export type TokenUser = {
  id: string;
  email: string;
  role: Role;
  name: string;
  employeeId?: string;
};

export type AuthedRequest = Request & { user: TokenUser };

export function signToken(user: TokenUser): string {
  return jwt.sign(user, SECRET, { expiresIn: "12h" });
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  return bcrypt.compareSync(password, passwordHash);
}

export async function tokenUserFromEmail(email: string, supabaseId?: string): Promise<TokenUser | null> {
  const { loadStore } = await import("./lib/store.js");
  const store = loadStore();
  const local = store.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
  if (local) {
    return {
      id: supabaseId ?? local.id,
      email: local.email,
      role: local.role,
      name: local.name,
      employeeId: local.employeeId,
    };
  }
  return null;
}

export async function resolveSupabaseUser(accessToken: string): Promise<TokenUser | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  const metaRole = data.user.app_metadata?.role;
  const mapped = await tokenUserFromEmail(data.user.email, data.user.id);
  if (mapped) {
    if (metaRole === "admin") mapped.role = "admin";
    return mapped;
  }
  const fullName =
    typeof data.user.user_metadata?.full_name === "string" ? data.user.user_metadata.full_name : data.user.email;
  return {
    id: data.user.id,
    email: data.user.email,
    role: metaRole === "admin" ? "admin" : "employee",
    name: fullName,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Connexion requise" });
    return;
  }
  const token = header.slice(7);
  const supabaseUser = await resolveSupabaseUser(token);
  if (supabaseUser) {
    (req as Request & { user?: TokenUser }).user = supabaseUser;
    next();
    return;
  }
  try {
    (req as Request & { user?: TokenUser }).user = jwt.verify(token, SECRET) as TokenUser;
    next();
  } catch {
    res.status(401).json({ error: "Session expirée" });
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    if (getUser(req).role !== "admin") {
      res.status(403).json({ error: "Accès administrateur requis" });
      return;
    }
    next();
  });
}

export function getUser(req: Request): TokenUser {
  const user = (req as Request & { user?: TokenUser }).user;
  if (!user) throw new Error("Utilisateur manquant");
  return user;
}

export function publicUser(user: TokenUser) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    employeeId: user.employeeId ?? null,
  };
}
