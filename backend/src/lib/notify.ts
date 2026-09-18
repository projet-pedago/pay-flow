import { randomUUID } from "node:crypto";
import type { AppNotification, Store } from "../types.js";

export function pushNotification(
  store: Store,
  input: { userId: string; title: string; body: string; link: string },
): AppNotification {
  const item: AppNotification = {
    id: randomUUID(),
    userId: input.userId,
    title: input.title,
    body: input.body,
    link: input.link,
    read: false,
    createdAt: new Date().toISOString(),
  };
  store.notifications.unshift(item);
  return item;
}

export function notifyAdmins(store: Store, input: { title: string; body: string; link: string }): void {
  for (const userId of ["role:admin", "role:hr"]) {
    pushNotification(store, { ...input, userId });
  }
}

export function notifyEmployee(store: Store, employeeId: string, input: { title: string; body: string; link: string }): void {
  const employee = store.employees.find((item) => item.id === employeeId);
  const userId = employee?.entraObjectId;
  if (userId) pushNotification(store, { ...input, userId });
}
