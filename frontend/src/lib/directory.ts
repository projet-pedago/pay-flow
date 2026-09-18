export type DirectoryRole = "admin" | "hr" | "employee";

export const directoryRoleLabel: Record<DirectoryRole, string> = {
  admin: "Admin",
  hr: "RH",
  employee: "Employé",
};

export const payflowRoleLabel: Record<string, string> = {
  PAYFLOW_ADMIN: "Admin",
  PAYFLOW_HR: "RH",
  PAYFLOW_EMPLOYEE: "Employé",
};

export const payflowRoleStyle: Record<string, string> = {
  PAYFLOW_ADMIN: "bg-ink text-white",
  PAYFLOW_HR: "bg-sage/15 text-sage",
  PAYFLOW_EMPLOYEE: "bg-amber-100 text-amber-900",
};

export function directoryRoleOf(role?: DirectoryRole): DirectoryRole {
  return role ?? "employee";
}
