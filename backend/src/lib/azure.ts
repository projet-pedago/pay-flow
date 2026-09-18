import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = (process.env[name] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function tenant(): string {
  return readEnv("AZURE_TENANT_ID", "VITE_AZURE_TENANT_ID");
}

function spaClientId(): string {
  return readEnv("AZURE_CLIENT_ID", "VITE_AZURE_CLIENT_ID");
}

function apiClientId(): string {
  return readEnv("AZURE_API_CLIENT_ID", "VITE_AZURE_API_CLIENT_ID");
}

export function azureConfigured(): boolean {
  return Boolean(tenant() && (apiClientId() || spaClientId()));
}

function jwks(tid: string) {
  return createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tid}/discovery/v2.0/keys`));
}

function assertMicrosoftIssuer(iss: string) {
  if (!iss.includes("login.microsoftonline.com") && !iss.includes("sts.windows.net")) {
    throw new Error("Émetteur Microsoft invalide");
  }
}

function emailFromClaims(claims: JWTPayload | undefined): string {
  if (!claims) return "";
  const rec = claims as Record<string, unknown>;
  return String(rec.preferred_username ?? rec.email ?? rec.upn ?? rec.unique_name ?? "").toLowerCase();
}

export async function verifyMicrosoftTokens(input: {
  accessToken?: string;
  idToken?: string;
}): Promise<{ email: string; name: string; sub: string }> {
  const tid = tenant();
  if (!tid) {
    throw new Error("Microsoft Entra ID n’est pas configuré (AZURE_TENANT_ID)");
  }

  const keys = jwks(tid);
  let accessPayload: JWTPayload | undefined;
  let idPayload: JWTPayload | undefined;

  if (input.accessToken) {
    const audience = apiClientId();
    if (!audience) throw new Error("AZURE_API_CLIENT_ID n’est pas configuré");
    const { payload } = await jwtVerify(input.accessToken, keys, {
      audience: [audience, `api://${audience}`],
    });
    assertMicrosoftIssuer(String(payload.iss ?? ""));
    accessPayload = payload;
  }

  if (input.idToken) {
    const audience = spaClientId();
    if (!audience) throw new Error("AZURE_CLIENT_ID n’est pas configuré");
    const { payload } = await jwtVerify(input.idToken, keys, { audience });
    assertMicrosoftIssuer(String(payload.iss ?? ""));
    idPayload = payload;
  }

  if (!accessPayload && !idPayload) {
    throw new Error("Jeton Microsoft manquant");
  }

  const email = emailFromClaims(idPayload) || emailFromClaims(accessPayload);
  if (!email || !email.includes("@")) {
    throw new Error("Microsoft n’a pas renvoyé d’email");
  }

  const merged = { ...(accessPayload ?? {}), ...(idPayload ?? {}) } as Record<string, unknown>;
  return {
    email,
    name: String(merged.name ?? email),
    sub: String((accessPayload ?? idPayload)?.sub ?? email),
  };
}
