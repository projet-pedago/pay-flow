import type { Role } from "../types.js";

export function isStaff(role: Role): boolean {
  return role === "admin" || role === "hr";
}
