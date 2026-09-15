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
  store.users.filter((user) => user.role === "admin").forEach((user) => {
    pushNotification(store, { ...input, userId: user.id });
  });
}

export function notifyEmployee(store: Store, employeeId: string, input: { title: string; body: string; link: string }): void {
  const user = store.users.find((item) => item.employeeId === employeeId);
  if (user) pushNotification(store, { ...input, userId: user.id });
}
