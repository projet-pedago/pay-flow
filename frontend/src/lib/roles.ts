export type UserRole = "admin" | "hr" | "employee";

export function homePath(role: UserRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "hr":
      return "/rh";
    default:
      return "/espace";
  }
}

export function isStaff(role: UserRole): boolean {
  return role === "admin" || role === "hr";
}

export function staffBase(role: UserRole): "/admin" | "/rh" {
  return role === "hr" ? "/rh" : "/admin";
}
