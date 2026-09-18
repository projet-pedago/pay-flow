const GRAPH = "https://graph.microsoft.com/v1.0";
const PAYFLOW_ROLES = ["PAYFLOW_ADMIN", "PAYFLOW_HR", "PAYFLOW_EMPLOYEE"] as const;
export type PayflowEntraRole = (typeof PAYFLOW_ROLES)[number];

export type EntraDirectoryUser = {
  id: string;
  displayName: string;
  userPrincipalName: string;
  mail: string | null;
  accountEnabled: boolean;
  roles: PayflowEntraRole[];
  linkedEmployeeId: string | null;
  linkedEmployeeName: string | null;
};

type GraphErrorBody = { error?: { message?: string; code?: string } };
type TokenCache = { accessToken: string; expiresAt: number };
type UserCache = { users: EntraDirectoryUser[]; expiresAt: number };

let tokenCache: TokenCache | null = null;
let userCache: UserCache | null = null;

function readEnv(...names: string[]): string {
  for (const name of names) {
    const value = (process.env[name] ?? "").trim();
    if (value) return value;
  }
  return "";
}

function tenantId(): string {
  return readEnv("AZURE_TENANT_ID", "VITE_AZURE_TENANT_ID");
}

function graphClientId(): string {
  return readEnv("AZURE_GRAPH_CLIENT_ID", "AZURE_PROVISIONING_CLIENT_ID");
}

function graphSecret(): string {
  return readEnv("AZURE_GRAPH_CLIENT_SECRET", "AZURE_PROVISIONING_CLIENT_SECRET");
}

function apiAppId(): string {
  return readEnv("AZURE_API_CLIENT_ID", "VITE_AZURE_API_CLIENT_ID");
}

function spaAppId(): string {
  return readEnv("AZURE_CLIENT_ID", "VITE_AZURE_CLIENT_ID");
}

export function graphConfigured(): boolean {
  return Boolean(tenantId() && graphClientId() && graphSecret());
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
    client_id: graphClientId(),
    client_secret: graphSecret(),
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });
  const response = await fetch(`https://login.microsoftonline.com/${tenantId()}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.error_description || "Impossible d’obtenir un jeton Microsoft Graph");
  }
  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Math.max(60, payload.expires_in ?? 3600) * 1000,
  };
  return tokenCache.accessToken;
}

async function graph<T>(pathOrUrl: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await graphToken();
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${GRAPH}${pathOrUrl}`;
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ConsistencyLevel: "eventual",
      ...(init?.headers ?? {}),
    },
  });
  const text = await response.text();
  const data = (text ? JSON.parse(text) : {}) as T;
  return { ok: response.ok, status: response.status, data };
}

async function graphList<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = path;
  while (next) {
    const page: { ok: boolean; status: number; data: { value?: T[]; "@odata.nextLink"?: string } } = await graph(next);
    if (!page.ok) {
      throw new Error(graphMessage(page.data, `Lecture Graph refusée (${page.status})`));
    }
    items.push(...(page.data.value ?? []));
    next = page.data["@odata.nextLink"];
  }
  return items;
}

type ServicePrincipal = {
  id: string;
  appId: string;
  displayName?: string;
  appRoles?: { id: string; value?: string; isEnabled?: boolean }[];
};

type AppRoleAssignment = {
  principalId: string;
  principalDisplayName?: string;
  principalType?: string;
  appRoleId: string;
};

type GraphUser = {
  id: string;
  displayName?: string;
  userPrincipalName?: string;
  mail?: string | null;
  accountEnabled?: boolean;
};

async function servicePrincipalByAppId(appId: string): Promise<ServicePrincipal | null> {
  if (!appId) return null;
  const rows = await graphList<ServicePrincipal>(`/servicePrincipals?$filter=appId eq '${appId}'&$select=id,appId,displayName,appRoles`);
  return rows[0] ?? null;
}

function roleValue(appRoles: ServicePrincipal["appRoles"], appRoleId: string): PayflowEntraRole | null {
  const value = appRoles?.find((role) => role.id === appRoleId)?.value;
  if (value === "PAYFLOW_ADMIN" || value === "PAYFLOW_HR" || value === "PAYFLOW_EMPLOYEE") return value;
  return null;
}

async function assignmentsForApp(appId: string): Promise<{ oid: string; roles: PayflowEntraRole[]; displayName?: string }[]> {
  const sp = await servicePrincipalByAppId(appId);
  if (!sp) return [];
  const assignments = await graphList<AppRoleAssignment>(`/servicePrincipals/${sp.id}/appRoleAssignedTo`);
  const byOid = new Map<string, { roles: Set<PayflowEntraRole>; displayName?: string }>();
  for (const assignment of assignments) {
    if (assignment.principalType && assignment.principalType !== "User") continue;
    const role = roleValue(sp.appRoles, assignment.appRoleId);
    if (!role) continue;
    const current = byOid.get(assignment.principalId) ?? { roles: new Set<PayflowEntraRole>(), displayName: assignment.principalDisplayName };
    current.roles.add(role);
    current.displayName = current.displayName || assignment.principalDisplayName;
    byOid.set(assignment.principalId, current);
  }
  return [...byOid.entries()].map(([oid, value]) => ({ oid, roles: [...value.roles], displayName: value.displayName }));
}

async function loadGraphUser(oid: string): Promise<GraphUser | null> {
  const result = await graph<GraphUser & GraphErrorBody>(
    `/users/${oid}?$select=id,displayName,userPrincipalName,mail,accountEnabled`,
  );
  if (!result.ok) return null;
  return result.data;
}

export function visibleEntraUsers(users: EntraDirectoryUser[], role: "admin" | "hr" | "employee"): EntraDirectoryUser[] {
  if (role === "employee") return [];
  if (role === "hr") {
    return users.filter(
      (item) => item.roles.includes("PAYFLOW_EMPLOYEE") && !item.roles.includes("PAYFLOW_ADMIN") && !item.roles.includes("PAYFLOW_HR"),
    );
  }
  return users.filter((item) => item.roles.some((entry) => PAYFLOW_ROLES.includes(entry)));
}

export function withEmployeeLinks(
  users: Omit<EntraDirectoryUser, "linkedEmployeeId" | "linkedEmployeeName">[],
  employees: { id: string; firstName: string; lastName: string; entraObjectId?: string; entraUserPrincipalName?: string }[],
): EntraDirectoryUser[] {
  return users.map((user) => {
    const fiche = employees.find(
      (item) =>
        item.entraObjectId === user.id ||
        item.entraUserPrincipalName?.toLowerCase() === user.userPrincipalName.toLowerCase() ||
        (user.mail && item.entraUserPrincipalName?.toLowerCase() === user.mail.toLowerCase()),
    );
    return {
      ...user,
      linkedEmployeeId: fiche?.id ?? null,
      linkedEmployeeName: fiche ? `${fiche.firstName} ${fiche.lastName}` : null,
    };
  });
}

export async function listPayflowEntraUsers(): Promise<EntraDirectoryUser[]> {
  if (!graphConfigured()) {
    throw new Error(
      "Microsoft Graph n’est pas configuré. Renseignez AZURE_GRAPH_CLIENT_ID et AZURE_GRAPH_CLIENT_SECRET (application PayFlow-Provisioning, lecture seule).",
    );
  }
  if (userCache && userCache.expiresAt > Date.now()) {
    return userCache.users;
  }

  const assigned = new Map<string, Set<PayflowEntraRole>>();
  for (const appId of [apiAppId(), spaAppId()]) {
    const rows = await assignmentsForApp(appId);
    for (const row of rows) {
      const current = assigned.get(row.oid) ?? new Set<PayflowEntraRole>();
      row.roles.forEach((role) => current.add(role));
      assigned.set(row.oid, current);
    }
  }

  const users: Omit<EntraDirectoryUser, "linkedEmployeeId" | "linkedEmployeeName">[] = [];
  const oids = [...assigned.keys()];
  const chunk = 6;
  for (let index = 0; index < oids.length; index += chunk) {
    const slice = oids.slice(index, index + chunk);
    const profiles = await Promise.all(slice.map((oid) => loadGraphUser(oid)));
    profiles.forEach((profile, offset) => {
      const oid = slice[offset];
      const roles = [...(assigned.get(oid) ?? [])];
      if (!profile || roles.length === 0) return;
      users.push({
        id: profile.id,
        displayName: profile.displayName || profile.userPrincipalName || profile.mail || oid,
        userPrincipalName: profile.userPrincipalName || profile.mail || "",
        mail: profile.mail ?? null,
        accountEnabled: profile.accountEnabled !== false,
        roles,
      });
    });
  }

  users.sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
  const result = users.map((user) => ({ ...user, linkedEmployeeId: null, linkedEmployeeName: null }));
  userCache = { users: result, expiresAt: Date.now() + 45_000 };
  return result;
}
