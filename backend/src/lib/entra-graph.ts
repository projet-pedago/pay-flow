const GRAPH = "https://graph.microsoft.com/v1.0";
const PAYFLOW_ROLES = ["PAYFLOW_ADMIN", "PAYFLOW_HR", "PAYFLOW_EMPLOYEE"] as const;
export type PayflowEntraRole = (typeof PAYFLOW_ROLES)[number];

const PAYFLOW_RESOURCE = "PayFlow";
const SKIP_RESOURCES = new Set(["PayFlow-Frontend", "PayFlow-Provisioning"]);
const DEFAULT_ASSIGNMENT_ROLE_ID = "00000000-0000-0000-0000-000000000000";

/**
 * Identifiants des rôles applicatifs PayFlow (app registration API).
 * Utilisés quand Graph refuse /servicePrincipals (pas Application.Read.All).
 * Surcharge : AZURE_PAYFLOW_ROLE_ADMIN_ID / _HR_ID / _EMPLOYEE_ID.
 */
export const FALLBACK_PAYFLOW_APPROLE_IDS: Record<string, PayflowEntraRole> = {
  "68b0c89b-e615-470a-8a92-50f57b07a4be": "PAYFLOW_ADMIN",
  "13f289a4-a8c1-41ad-afe5-64040b587b26": "PAYFLOW_HR",
  "394165ce-9655-44b9-aca2-12b406dcc69a": "PAYFLOW_EMPLOYEE",
};

export type EntraDirectoryUser = {
  id: string;
  displayName: string;
  givenName: string | null;
  surname: string | null;
  userPrincipalName: string;
  mail: string | null;
  accountEnabled: boolean;
  roles: PayflowEntraRole[];
  linkedEmployeeId: string | null;
  linkedEmployeeName: string | null;
};

export type GraphAppRoleAssignment = {
  appRoleId?: string;
  resourceDisplayName?: string | null;
  resourceId?: string;
  principalType?: string;
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

export function isPayflowNamedAssignment(assignment: GraphAppRoleAssignment): boolean {
  const appRoleId = (assignment.appRoleId ?? "").toLowerCase();
  if (!appRoleId || appRoleId === DEFAULT_ASSIGNMENT_ROLE_ID) return false;
  const resource = assignment.resourceDisplayName ?? "";
  if (SKIP_RESOURCES.has(resource)) return false;
  return resource === PAYFLOW_RESOURCE;
}

export function envAppRoleCatalog(): Map<string, PayflowEntraRole> {
  const catalog = new Map<string, PayflowEntraRole>();
  for (const [id, role] of Object.entries(FALLBACK_PAYFLOW_APPROLE_IDS)) {
    catalog.set(id.toLowerCase(), role);
  }
  const overrides: Array<[string, PayflowEntraRole]> = [
    ["AZURE_PAYFLOW_ROLE_ADMIN_ID", "PAYFLOW_ADMIN"],
    ["AZURE_PAYFLOW_ROLE_HR_ID", "PAYFLOW_HR"],
    ["AZURE_PAYFLOW_ROLE_EMPLOYEE_ID", "PAYFLOW_EMPLOYEE"],
  ];
  for (const [name, role] of overrides) {
    const id = readEnv(name).toLowerCase();
    if (id) catalog.set(id, role);
  }
  return catalog;
}

export function payflowRolesFromAssignments(
  assignments: GraphAppRoleAssignment[] | undefined,
  catalog: Map<string, PayflowEntraRole>,
): PayflowEntraRole[] {
  const roles = new Set<PayflowEntraRole>();
  for (const assignment of assignments ?? []) {
    if (!isPayflowNamedAssignment(assignment)) continue;
    const role = catalog.get((assignment.appRoleId ?? "").toLowerCase());
    if (role) roles.add(role);
  }
  return PAYFLOW_ROLES.filter((role) => roles.has(role));
}

type ServicePrincipal = {
  id: string;
  appId: string;
  displayName?: string;
  appRoles?: { id: string; value?: string; isEnabled?: boolean }[];
};

type GraphDirectoryUser = {
  id: string;
  displayName?: string;
  givenName?: string | null;
  surname?: string | null;
  userPrincipalName?: string;
  mail?: string | null;
  accountEnabled?: boolean;
  appRoleAssignments?: GraphAppRoleAssignment[];
};

async function enrichCatalogFromServicePrincipals(
  resourceIds: string[],
  catalog: Map<string, PayflowEntraRole>,
): Promise<void> {
  for (const id of resourceIds) {
    const result = await graph<ServicePrincipal & GraphErrorBody>(
      `/servicePrincipals/${id}?$select=id,appId,displayName,appRoles`,
    );
    if (!result.ok) continue;
    for (const role of result.data.appRoles ?? []) {
      const value = role.value;
      if (value === "PAYFLOW_ADMIN" || value === "PAYFLOW_HR" || value === "PAYFLOW_EMPLOYEE") {
        catalog.set(role.id.toLowerCase(), value);
      }
    }
  }
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

  const directory = await graphList<GraphDirectoryUser>(
    "/users?$select=id,displayName,givenName,surname,userPrincipalName,mail,accountEnabled&$expand=appRoleAssignments",
  );

  const catalog = envAppRoleCatalog();
  const resourceIds = [
    ...new Set(
      directory.flatMap((user) =>
        (user.appRoleAssignments ?? [])
          .filter(isPayflowNamedAssignment)
          .map((assignment) => assignment.resourceId)
          .filter((id): id is string => Boolean(id)),
      ),
    ),
  ];
  await enrichCatalogFromServicePrincipals(resourceIds, catalog);

  const users: Omit<EntraDirectoryUser, "linkedEmployeeId" | "linkedEmployeeName">[] = [];
  for (const profile of directory) {
    const roles = payflowRolesFromAssignments(profile.appRoleAssignments, catalog);
    if (roles.length === 0) continue;
    const upn = profile.userPrincipalName || profile.mail || "";
    users.push({
      id: profile.id,
      displayName: profile.displayName || upn || profile.id,
      givenName: profile.givenName?.trim() || null,
      surname: profile.surname?.trim() || null,
      userPrincipalName: upn,
      mail: profile.mail ?? null,
      accountEnabled: profile.accountEnabled !== false,
      roles,
    });
  }

  users.sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
  const result = users.map((user) => ({ ...user, linkedEmployeeId: null, linkedEmployeeName: null }));
  userCache = { users: result, expiresAt: Date.now() + 45_000 };
  return result;
}
