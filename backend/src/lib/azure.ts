import { createRemoteJWKSet, jwtVerify } from "jose";

function tenant(): string {
  return (process.env.AZURE_TENANT_ID ?? process.env.VITE_AZURE_TENANT_ID ?? "common").trim() || "common";
}

function clientId(): string {
  return (process.env.AZURE_CLIENT_ID ?? process.env.VITE_AZURE_CLIENT_ID ?? "").trim();
}

export function azureConfigured(): boolean {
  return Boolean(clientId());
}

export async function verifyMicrosoftIdToken(idToken: string): Promise<{ email: string; name: string; sub: string }> {
  const audience = clientId();
  if (!audience) throw new Error("Microsoft Entra ID n’est pas configuré (AZURE_CLIENT_ID)");

  const tid = tenant();
  const jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tid}/discovery/v2.0/keys`));
  const { payload } = await jwtVerify(idToken, jwks, {
    audience,
  });

  const claims = payload as Record<string, unknown>;
  const iss = String(claims.iss ?? "");
  if (!iss.includes("login.microsoftonline.com") && !iss.includes("sts.windows.net")) {
    throw new Error("Émetteur Microsoft invalide");
  }

  const email = String(claims.preferred_username ?? claims.email ?? claims.upn ?? "").toLowerCase();
  if (!email || !email.includes("@")) throw new Error("Microsoft n’a pas renvoyé d’email");
  const name = String(claims.name ?? email);
  return { email, name, sub: String(claims.sub ?? email) };
}
