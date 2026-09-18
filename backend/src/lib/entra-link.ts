import type { Employee } from "../types.js";
import { directoryRoleOf, effectivePayflowRole, expectedPayflowRole } from "./directory-role.js";
import type { PayflowEntraRole } from "./entra-graph.js";
import { loadStore, mutate } from "./store.js";

export const UNLINKED_EMPLOYEE_MESSAGE =
  "Ce compte n'est pas lié à une fiche employé. Demandez à un administrateur d’associer votre compte Microsoft.";

export type GraphIdentity = {
  id: string;
  displayName: string;
  givenName?: string | null;
  surname?: string | null;
  userPrincipalName: string;
  roles: PayflowEntraRole[];
};

export function normalizeMicrosoftEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function foldName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function namesMatch(
  fiche: { firstName: string; lastName: string },
  entra: { firstName: string; lastName: string },
): boolean {
  return foldName(fiche.firstName) === foldName(entra.firstName) && foldName(fiche.lastName) === foldName(entra.lastName);
}

export function identityNamesFromGraph(user: {
  givenName?: string | null;
  surname?: string | null;
  displayName: string;
}): { firstName: string; lastName: string } {
  const given = (user.givenName ?? "").trim();
  const surname = (user.surname ?? "").trim();
  if (given && surname) return { firstName: given, lastName: surname };
  const parts = user.displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return { firstName: parts.slice(0, -1).join(" "), lastName: parts[parts.length - 1] ?? "" };
  }
  return { firstName: parts[0] ?? "", lastName: "" };
}

export function associationDecision(
  fiche: Pick<Employee, "firstName" | "lastName" | "directoryRole">,
  graph: GraphIdentity,
): { ok: true } | { ok: false; error: string } {
  const entraNames = identityNamesFromGraph(graph);
  const sameParts = namesMatch(fiche, entraNames);
  const sameDisplay = foldName(`${fiche.firstName} ${fiche.lastName}`) === foldName(graph.displayName);
  if (!sameParts && !sameDisplay) {
    return {
      ok: false,
      error: "Le prénom et le nom de la fiche PayRollFlow ne correspondent pas au compte Microsoft sélectionné.",
    };
  }
  const expected = expectedPayflowRole(directoryRoleOf(fiche));
  const effective = effectivePayflowRole(graph.roles);
  if (effective !== expected) {
    return {
      ok: false,
      error: "Le rôle PayFlow du compte Microsoft ne correspond pas au type de cette identité.",
    };
  }
  return { ok: true };
}

export function findEmployeeForMicrosoft(
  employees: Employee[],
  identity: { id: string; email: string },
): Employee | undefined {
  const oid = identity.id.trim();
  const email = normalizeMicrosoftEmail(identity.email);

  if (oid) {
    const byOid = employees.find((item) => item.entraObjectId === oid);
    if (byOid) return byOid;
  }

  if (email) {
    const byUpn = employees.find((item) => item.entraUserPrincipalName?.toLowerCase() === email);
    if (byUpn) return byUpn;
  }

  return undefined;
}

export function microsoftUpnTaken(employees: Employee[], upn: string, exceptId?: string): Employee | undefined {
  const email = normalizeMicrosoftEmail(upn);
  if (!email) return undefined;
  return employees.find(
    (item) => item.id !== exceptId && item.entraUserPrincipalName?.toLowerCase() === email,
  );
}

export function microsoftOidTaken(employees: Employee[], oid: string, exceptId?: string): Employee | undefined {
  const id = oid.trim();
  if (!id) return undefined;
  return employees.find((item) => item.id !== exceptId && item.entraObjectId === id);
}

export function linkMicrosoftEmployee(identity: { id: string; email: string }): Employee | undefined {
  const oid = identity.id.trim();
  const email = normalizeMicrosoftEmail(identity.email);
  if (!oid && !email) return undefined;

  const current = findEmployeeForMicrosoft(loadStore().employees, identity);
  if (!current) return undefined;

  const needsOid = Boolean(oid && current.entraObjectId !== oid);
  const needsUpn = Boolean(email && current.entraUserPrincipalName?.toLowerCase() !== email);
  if (!needsOid && !needsUpn) return current;

  return mutate((store) => {
    const item = store.employees.find((entry) => entry.id === current.id);
    if (!item) return undefined;
    if (oid && item.entraObjectId !== oid) {
      for (const other of store.employees) {
        if (other.id !== item.id && other.entraObjectId === oid) other.entraObjectId = undefined;
      }
      item.entraObjectId = oid;
    }
    if (email && item.entraUserPrincipalName?.toLowerCase() !== email) item.entraUserPrincipalName = email;
    return item;
  });
}

export function associateMicrosoftAccount(
  employeeId: string,
  graphUser: GraphIdentity | null,
): { employee: Employee } | { error: string; status: number } {
  return mutate((store) => {
    const item = store.employees.find((entry) => entry.id === employeeId);
    if (!item) return { error: "Identité introuvable", status: 404 };

    if (!graphUser) {
      item.entraObjectId = undefined;
      item.entraUserPrincipalName = undefined;
      return { employee: item };
    }

    const decision = associationDecision(item, graphUser);
    if (!decision.ok) return { error: decision.error, status: 409 };

    const takenOid = microsoftOidTaken(store.employees, graphUser.id, employeeId);
    if (takenOid) {
      return {
        error: `Ce compte Microsoft est déjà associé à ${takenOid.firstName} ${takenOid.lastName}.`,
        status: 409,
      };
    }
    const takenUpn = microsoftUpnTaken(store.employees, graphUser.userPrincipalName, employeeId);
    if (takenUpn) {
      return {
        error: `Ce compte Microsoft est déjà associé à ${takenUpn.firstName} ${takenUpn.lastName}.`,
        status: 409,
      };
    }

    for (const other of store.employees) {
      if (other.id === item.id) continue;
      if (other.entraObjectId === graphUser.id) other.entraObjectId = undefined;
      if (other.entraUserPrincipalName?.toLowerCase() === graphUser.userPrincipalName.toLowerCase()) {
        other.entraUserPrincipalName = undefined;
      }
    }

    item.entraObjectId = graphUser.id;
    item.entraUserPrincipalName = normalizeMicrosoftEmail(graphUser.userPrincipalName);
    return { employee: item };
  });
}
