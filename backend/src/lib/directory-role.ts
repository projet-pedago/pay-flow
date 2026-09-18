import type { Employee, Role } from "../types.js";
import type { PayflowEntraRole } from "./entra-graph.js";

export function directoryRoleOf(employee: Pick<Employee, "directoryRole">): Role {
  return employee.directoryRole ?? "employee";
}

export function isPayrollEmployee(employee: Pick<Employee, "directoryRole">): boolean {
  return directoryRoleOf(employee) === "employee";
}

export function expectedPayflowRole(role: Role): PayflowEntraRole {
  switch (role) {
    case "admin":
      return "PAYFLOW_ADMIN";
    case "hr":
      return "PAYFLOW_HR";
    default:
      return "PAYFLOW_EMPLOYEE";
  }
}

export function effectivePayflowRole(roles: PayflowEntraRole[]): PayflowEntraRole | null {
  if (roles.includes("PAYFLOW_ADMIN")) return "PAYFLOW_ADMIN";
  if (roles.includes("PAYFLOW_HR")) return "PAYFLOW_HR";
  if (roles.includes("PAYFLOW_EMPLOYEE")) return "PAYFLOW_EMPLOYEE";
  return null;
}
