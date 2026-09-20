import "./lib/env.js";

import bcrypt from "bcryptjs";
import type {
  NextFunction,
  Request,
  Response,
} from "express";
import jwt from "jsonwebtoken";

import {
  JWT_SECRET,
} from "./lib/env.js";

import {
  provisionMicrosoftProfile,
} from "./lib/entra-link.js";

import {
  getSupabase,
} from "./lib/supabase.js";

import {
  isStaff,
} from "./lib/roles.js";

import type {
  Role,
} from "./types.js";

export const AUTH_COOKIE =
  "payrollflow_token";

export type TokenUser = {
  id: string;
  email: string;
  role: Role;
  name: string;
  employeeId?: string;
};

export type AuthedRequest =
  Request & {
    user: TokenUser;
  };

export function signToken(
  user: TokenUser,
): string {
  return jwt.sign(
    user,
    JWT_SECRET,
    {
      expiresIn: "12h",
    },
  );
}

export function hashPassword(
  password: string,
): string {
  return bcrypt.hashSync(
    password,
    10,
  );
}

export function verifyPassword(
  password: string,
  passwordHash: string,
): boolean {
  return bcrypt.compareSync(
    password,
    passwordHash,
  );
}

function cookieHeader(
  token: string,
  maxAgeSec: number,
): string {
  const parts = [
    `${AUTH_COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSec}`,
  ];

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    parts.push("Secure");
  }

  return parts.join("; ");
}

export function setAuthCookie(
  res: Response,
  token: string,
): void {
  res.append(
    "Set-Cookie",
    cookieHeader(
      token,
      12 * 60 * 60,
    ),
  );
}

export function clearAuthCookie(
  res: Response,
): void {
  const parts = [
    `${AUTH_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=0",
  ];

  if (
    process.env.NODE_ENV ===
    "production"
  ) {
    parts.push("Secure");
  }

  res.append(
    "Set-Cookie",
    parts.join("; "),
  );
}

export function tokenFromRequest(
  req: Request,
): string | null {
  const header =
    req.headers.authorization;

  if (
    header?.startsWith("Bearer ")
  ) {
    return header.slice(7);
  }

  const cookie =
    req.headers.cookie;

  if (!cookie) {
    return null;
  }

  const match =
    cookie
      .split(";")
      .map(
        (part) =>
          part.trim(),
      )
      .find(
        (part) =>
          part.startsWith(
            `${AUTH_COOKIE}=`,
          ),
      );

  if (!match) {
    return null;
  }

  return decodeURIComponent(
    match.slice(
      AUTH_COOKIE.length + 1,
    ),
  );
}

/*
 * Ancien mécanisme Supabase/local.
 *
 * On le conserve pour compatibilité avec
 * l'authentification Supabase existante.
 */
export async function tokenUserFromEmail(
  email: string,
  supabaseId?: string,
): Promise<TokenUser | null> {
  const {
    loadStore,
  } = await import(
    "./lib/store.js"
  );

  const store =
    loadStore();

  const local =
    store.users.find(
      (item) =>
        item.email.toLowerCase() ===
        email.toLowerCase(),
    );

  if (local) {
    return {
      id:
        supabaseId ??
        local.id,

      email:
        local.email,

      role:
        local.role,

      name:
        local.name,

      employeeId:
        local.employeeId,
    };
  }

  return null;
}

export async function resolveSupabaseUser(
  accessToken: string,
): Promise<TokenUser | null> {
  const supabase =
    getSupabase();

  if (!supabase) {
    return null;
  }

  const {
    data,
    error,
  } =
    await supabase.auth.getUser(
      accessToken,
    );

  if (
    error ||
    !data.user?.email
  ) {
    return null;
  }

  const metaRole =
    data.user.app_metadata?.role;

  const mapped =
    await tokenUserFromEmail(
      data.user.email,
      data.user.id,
    );

  if (mapped) {
    if (
      metaRole === "admin"
    ) {
      mapped.role = "admin";
    }

    return mapped;
  }

  const fullName =
    typeof data.user
      .user_metadata?.full_name ===
    "string"
      ? data.user.user_metadata
          .full_name
      : data.user.email;

  return {
    id:
      data.user.id,

    email:
      data.user.email,

    role:
      metaRole === "admin"
        ? "admin"
        : "employee",

    name:
      fullName,
  };
}

/*
 * IMPORTANT :
 *
 * provisionMicrosoftProfile() utilise maintenant
 * PostgreSQL et est donc ASYNCHRONE.
 *
 * Il faut obligatoirement utiliser await.
 */
async function attachEmployeeFiche(
  user: TokenUser,
): Promise<TokenUser> {
  const linked =
    await provisionMicrosoftProfile({
      oid:
        user.id,

      email:
        user.email,

      name:
        user.name,

      role:
        user.role,
    });

  user.employeeId =
    linked?.id;

  return user;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token =
    tokenFromRequest(req);

  if (!token) {
    res.status(401).json({
      error:
        "Connexion requise",
    });

    return;
  }

  /*
   * 1. Essai avec le JWT PayFlow.
   */
  try {
    const verified =
      jwt.verify(
        token,
        JWT_SECRET,
      ) as TokenUser;

    const user =
      await attachEmployeeFiche(
        verified,
      );

    (
      req as Request & {
        user?: TokenUser;
      }
    ).user = user;

    next();

    return;
  } catch {
    /*
     * Le token n'est peut-être pas
     * un JWT PayFlow.
     *
     * On essaie Supabase ensuite.
     */
  }

  /*
   * 2. Essai Supabase.
   */
  const supabaseUser =
    await resolveSupabaseUser(
      token,
    );

  if (supabaseUser) {
    const user =
      await attachEmployeeFiche(
        supabaseUser,
      );

    (
      req as Request & {
        user?: TokenUser;
      }
    ).user = user;

    next();

    return;
  }

  res.status(401).json({
    error:
      "Session expirée",
  });
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(
    req,
    res,
    () => {
      if (
        getUser(req).role !==
        "admin"
      ) {
        res.status(403).json({
          error:
            "Accès administrateur requis",
        });

        return;
      }

      next();
    },
  );
}

export async function requireStaff(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  await requireAuth(
    req,
    res,
    () => {
      if (
        !isStaff(
          getUser(req).role,
        )
      ) {
        res.status(403).json({
          error:
            "Accès RH ou administrateur requis",
        });

        return;
      }

      next();
    },
  );
}

export function getUser(
  req: Request,
): TokenUser {
  const user =
    (
      req as Request & {
        user?: TokenUser;
      }
    ).user;

  if (!user) {
    throw new Error(
      "Utilisateur manquant",
    );
  }

  return user;
}

export function publicUser(
  user: TokenUser,
) {
  return {
    id:
      user.id,

    email:
      user.email,

    role:
      user.role,

    name:
      user.name,

    employeeId:
      user.employeeId ??
      null,
  };
}