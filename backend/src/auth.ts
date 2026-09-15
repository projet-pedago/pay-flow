import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
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

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Connexion requise" });
    return;
  }
  try {
    (req as Request & { user?: TokenUser }).user = jwt.verify(header.slice(7), SECRET) as TokenUser;
    next();
  } catch {
    res.status(401).json({ error: "Session expirée" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
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
