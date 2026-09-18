import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "../types.js";
import { createSeed } from "./seed.js";

const dataDir = process.env.DATA_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "../../data");
const storePath = join(dataDir, "store.json");
const lockPath = join(dataDir, "store.json.lock");

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function acquireLock(): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const deadline = Date.now() + 8000;
  for (;;) {
    try {
      const fd = openSync(lockPath, "wx");
      closeSync(fd);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EEXIST") throw error;
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 10000) unlinkSync(lockPath);
      } catch {
        /* ignore stale lock races */
      }
      if (Date.now() > deadline) throw new Error("Impossible de verrouiller store.json");
      sleepSync(25);
    }
  }
}

function releaseLock(): void {
  try {
    unlinkSync(lockPath);
  } catch {
    /* already released */
  }
}

function withLock<T>(fn: () => T): T {
  acquireLock();
  try {
    return fn();
  } finally {
    releaseLock();
  }
}

function writeStore(store: Store): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const tmp = `${storePath}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(store, null, 2));
  renameSync(tmp, storePath);
}

export const CURRENT_SCHEMA = 8;

/**
 * Schema 8 drops demo people and payroll objects (users, employees, payslips,
 * leaves, advances, documents, notifications) and keeps departments, settings
 * and URSSAF rates. Microsoft fiches created after the purge stay: their store
 * already has schemaVersion >= 8.
 */
export function applyStoreMigrations(store: Store): boolean {
  let dirty = false;
  if ((store.schemaVersion ?? 0) < CURRENT_SCHEMA) {
    store.employees = [];
    store.payslips = [];
    store.periods = [];
    store.leaves = [];
    store.advances = [];
    store.documents = [];
    store.notifications = [];
    store.users = [];
    store.auditLog = [];
    store.clients = [];
    store.partners = [];
    store.invoices = [];
    store.schemaVersion = CURRENT_SCHEMA;
    dirty = true;
  }
  if (!Array.isArray(store.users)) {
    store.users = [];
    dirty = true;
  }
  if (!Array.isArray(store.leaves)) {
    store.leaves = [];
    dirty = true;
  }
  if (!Array.isArray(store.advances)) {
    store.advances = [];
    dirty = true;
  }
  if (!Array.isArray(store.documents)) {
    store.documents = [];
    dirty = true;
  }
  if (!Array.isArray(store.notifications)) {
    store.notifications = [];
    dirty = true;
  }
  if (!Array.isArray(store.clients)) {
    store.clients = [];
    dirty = true;
  }
  if (!Array.isArray(store.partners)) {
    store.partners = [];
    dirty = true;
  }
  if (!Array.isArray(store.invoices)) {
    store.invoices = [];
    dirty = true;
  }
  if (!Array.isArray(store.auditLog)) {
    store.auditLog = [];
    dirty = true;
  }
  if (store.settings.advanceCapRatio == null) {
    store.settings.advanceCapRatio = 0.3;
    dirty = true;
  }
  if (!store.settings.companyAddress) {
    store.settings = {
      ...store.settings,
      companyAddress: store.settings.companyAddress ?? "",
      companyPostalCode: store.settings.companyPostalCode ?? "",
      siret: store.settings.siret ?? "",
      ape: store.settings.ape ?? "",
      conventionCollective: store.settings.conventionCollective ?? "Syntec",
      paymentMethod: store.settings.paymentMethod ?? "Virement",
      smicHourly: store.settings.smicHourly ?? 11.88,
      fillonT: store.settings.fillonT ?? 0.3195,
      advanceCapRatio: store.settings.advanceCapRatio ?? 0.3,
    };
    dirty = true;
  }
  store.employees = store.employees.map((employee, index) => {
    let next = employee;
    if (!employee.directoryRole) {
      dirty = true;
      next = { ...next, directoryRole: "employee" };
    }
    if (next.matricule && next.contractHours && next.directoryRole) {
      return next;
    }
    dirty = true;
    return {
      ...next,
      civility: next.civility ?? "M",
      matricule: next.matricule ?? String(1001 + index),
      address: next.address ?? "",
      postalCode: next.postalCode ?? "",
      socialSecurityNumber: next.socialSecurityNumber ?? "",
      category: next.category ?? "Non Cadre",
      coefficient: next.coefficient ?? "220",
      classificationIndex: next.classificationIndex ?? "1.3.1",
      qualification: next.qualification ?? "",
      contractHours: next.contractHours ?? store.settings.monthlyHours,
      pasRate: next.pasRate ?? 0,
      mealTicket5: next.mealTicket5 ?? 0,
      mealTicket1650: next.mealTicket1650 ?? 0,
      directoryRole: next.directoryRole ?? "employee",
    };
  });
  return dirty;
}

function readAndMigrate(): Store {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(storePath)) {
    const seeded = createSeed();
    writeStore(seeded);
    return seeded;
  }
  const store = JSON.parse(readFileSync(storePath, "utf8")) as Store;
  if (applyStoreMigrations(store)) writeStore(store);
  return store;
}

export function loadStore(): Store {
  return withLock(() => readAndMigrate());
}

export function mutate<T>(fn: (store: Store) => T): T {
  return withLock(() => {
    const store = readAndMigrate();
    const result = fn(store);
    writeStore(store);
    return result;
  });
}

export function resetStore(): Store {
  return withLock(() => {
    const seeded = createSeed();
    writeStore(seeded);
    return seeded;
  });
}

export function id(): string {
  return randomUUID();
}
