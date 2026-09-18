import { randomBytes } from "node:crypto";

const GRAPH = "https://graph.microsoft.com/v1.0";
const ROLE_VALUE = "PAYFLOW_EMPLOYEE";

type GraphErrorBody = {
  error?: { message?: string; code?: string };
};

type TokenCache = { accessToken: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function tenantId(): string {
  return (process.env.AZURE_TENANT_ID ?? "").trim();
}

function provisioningClientId(): string {
  return (process.env.AZURE_PROVISIONING_CLIENT_ID ?? "").trim();
}

function provisioningSecret(): string {
  return (process.env.AZURE_PROVISIONING_CLIENT_SECRET ?? "").trim();
}

function apiAppId(): string {
  return (process.env.AZURE_API_CLIENT_ID ?? process.env.AZURE_CLIENT_ID ?? "").trim();
}

export function entraProvisioningConfigured(): boolean {
  return Boolean(tenantId() && provisioningClientId() && provisioningSecret() && apiAppId());
}

function graphMessage(payload: unknown, fallback: string): string {
  const body = payload as GraphErrorBody;
  return body.error?.message || fallback;
}

async function graphToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.accessToken;
  }
  const body = new URLSearchParams({
    client_id: provisioningClientId(),
    client_secret: provisioningSecret(),
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const response = await fetch(`https://login.microsoftonline.com/${tenantId()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Impossible d’obtenir un jeton Microsoft Graph");
  }
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
  };
  return payload.access_token;
}

async function graph<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await graphToken();
  const response = await fetch(`${GRAPH}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = (text ? JSON.parse(text) : {}) as T;
  return { ok: response.ok, status: response.status, data };
}

function mailNickname(email: string, firstName: string, lastName: string): string {
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[^a-zA-Z0-9]/g, "") || `${firstName}${lastName}`.replace(/[^a-zA-Z0-9]/g, "");
  return (cleaned || "collaborateur").slice(0, 64);
}

function temporaryPassword(): string {
  return `Pf!${randomBytes(12).toString("base64url")}9aA`;
}

async function defaultDomain(): Promise<string> {
  const result = await graph<{ value?: { id: string; isDefault?: boolean; isVerified?: boolean }[] }>("/domains");
  if (!result.ok) throw new Error(graphMessage(result.data, "Impossible de lire les domaines Entra"));
  const domains = result.data.value ?? [];
  const chosen = domains.find((item) => item.isDefault) ?? domains.find((item) => item.isVerified) ?? domains[0];
  if (!chosen?.id) throw new Error("Aucun domaine Entra n’est disponible pour créer un UPN");
  return chosen.id;
}

async function findUser(email: string, upn: string): Promise<{ id: string } | null> {
  const escapedMail = email.replaceAll("'", "''");
  const escapedUpn = upn.replaceAll("'", "''");
  const filter = encodeURIComponent(`mail eq '${escapedMail}' or userPrincipalName eq '${escapedUpn}' or userPrincipalName eq '${escapedMail}'`);
  const result = await graph<{ value?: { id: string }[] }>(`/users?$select=id,mail,userPrincipalName&$filter=${filter}`);
  if (!result.ok) return null;
  return result.data.value?.[0] ?? null;
}

async function createUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  upn: string;
  nickname: string;
}): Promise<{ id: string }> {
  const result = await graph<{ id?: string } & GraphErrorBody>("/users", {
    method: "POST",
    body: JSON.stringify({
      accountEnabled: true,
      displayName: `${input.firstName} ${input.lastName}`.trim(),
      givenName: input.firstName,
      surname: input.lastName,
      mailNickname: input.nickname,
      userPrincipalName: input.upn,
      mail: input.email,
      otherMails: input.upn.toLowerCase() === input.email.toLowerCase() ? [] : [input.email],
      passwordProfile: {
        forceChangePasswordNextSignIn: true,
        password: temporaryPassword(),
      },
    }),
  });
  if (!result.ok || !result.data.id) {
    throw new Error(graphMessage(result.data, "Création de l’utilisateur Entra refusée"));
  }
  return { id: result.data.id };
}

async function apiServicePrincipal(): Promise<{ id: string; appRoles: { id: string; value?: string }[] }> {
  const appId = apiAppId();
  const result = await graph<{
    value?: { id: string; appRoles?: { id: string; value?: string }[] }[];
  }>(`/servicePrincipals?$filter=appId eq '${appId}'`);
  if (!result.ok) throw new Error(graphMessage(result.data, "Service principal PayFlow introuvable"));
  const sp = result.data.value?.[0];
  if (!sp?.id) {
    throw new Error("Service principal de l’API PayFlow introuvable (AZURE_API_CLIENT_ID)");
  }
  return { id: sp.id, appRoles: sp.appRoles ?? [] };
}

async function assignEmployeeRole(oid: string, resourceId: string, appRoleId: string): Promise<void> {
  const result = await graph<GraphErrorBody>(`/users/${oid}/appRoleAssignments`, {
    method: "POST",
    body: JSON.stringify({
      principalId: oid,
      resourceId,
      appRoleId,
    }),
  });
  if (result.ok || result.status === 409) return;
  const message = graphMessage(result.data, "Attribution du rôle PAYFLOW_EMPLOYEE refusée");
  if (/Permission being assigned already exists/i.test(message)) return;
  throw new Error(message);
}

export async function provisionPayFlowEmployee(input: {
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ ok: true; oid: string } | { ok: false; error: string }> {
  if (!entraProvisioningConfigured()) {
    return { ok: false, error: "Microsoft Graph n’est pas configuré (AZURE_PROVISIONING_CLIENT_ID / SECRET)." };
  }
  try {
    const domain = await defaultDomain();
    const email = input.email.trim();
    const emailDomain = email.split("@")[1]?.toLowerCase() ?? "";
    const nickname = mailNickname(email, input.firstName, input.lastName);
    const upn = emailDomain === domain.toLowerCase() ? email : `${nickname}@${domain}`;

    const existing = await findUser(email, upn);
    const user = existing ?? (await createUser({ email, firstName: input.firstName, lastName: input.lastName, upn, nickname }));

    const sp = await apiServicePrincipal();
    const role = sp.appRoles.find((item) => item.value === ROLE_VALUE);
    if (!role?.id) {
      throw new Error("Le rôle applicatif PAYFLOW_EMPLOYEE est introuvable sur l’API PayFlow");
    }
    await assignEmployeeRole(user.id, sp.id, role.id);
    return { ok: true, oid: user.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Provisionnement Entra impossible" };
  }
}
