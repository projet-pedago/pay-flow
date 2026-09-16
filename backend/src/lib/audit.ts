import type { AuditEvent, Store } from "../types.js";
import { id } from "./store.js";

export function pushAudit(
  store: Store,
  event: { actorEmail: string; action: string; detail: string; link?: string },
): AuditEvent {
  const entry: AuditEvent = {
    id: id(),
    at: new Date().toISOString(),
    actorEmail: event.actorEmail,
    action: event.action,
    detail: event.detail,
    link: event.link,
  };
  if (!Array.isArray(store.auditLog)) store.auditLog = [];
  store.auditLog.unshift(entry);
  store.auditLog = store.auditLog.slice(0, 400);
  return entry;
}
