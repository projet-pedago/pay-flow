import type { Employee } from "../types.js";
import { loadStore, mutate } from "./store.js";

export const UNLINKED_EMPLOYEE_MESSAGE =
  "Ce compte n'est pas lié à une fiche employé. Demandez à RH d’associer votre compte Microsoft.";

export function normalizeMicrosoftEmail(value: string): string {
  return value.trim().toLowerCase();
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
    const byEmail = employees.find((item) => item.email.toLowerCase() === email);
    if (byEmail) return byEmail;
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
  upn: string,
): { employee: Employee } | { error: string; status: number } {
  const email = normalizeMicrosoftEmail(upn);

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "UPN Microsoft invalide", status: 400 };
  }

  return mutate((store) => {
    const item = store.employees.find((entry) => entry.id === employeeId);
    if (!item) return { error: "Employé introuvable", status: 404 };

    if (!email) {
      item.entraObjectId = undefined;
      item.entraUserPrincipalName = undefined;
      return { employee: item };
    }

    const taken = microsoftUpnTaken(store.employees, email, employeeId);
    if (taken) {
      return {
        error: `Ce compte Microsoft est déjà associé à ${taken.firstName} ${taken.lastName}.`,
        status: 409,
      };
    }

    if (item.entraUserPrincipalName?.toLowerCase() !== email) {
      item.entraObjectId = undefined;
    }
    item.entraUserPrincipalName = email;
    return { employee: item };
  });
}
