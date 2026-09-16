import { randomUUID } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "../types.js";
import { buildNetwork, buildUsers, createSeed } from "./seed.js";

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

function readAndMigrate(): Store {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(storePath)) {
    const seeded = createSeed();
    writeStore(seeded);
    return seeded;
  }
  const store = JSON.parse(readFileSync(storePath, "utf8")) as Store;
  let dirty = false;
  if (!store.users?.length) {
    store.users = buildUsers(store.employees);
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
  if (!Array.isArray(store.clients) || !store.clients.length) {
    const network = buildNetwork();
    store.clients = network.clients;
    store.partners = network.partners;
    store.invoices = network.invoices;
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
    if (employee.matricule && employee.contractHours) return employee;
    dirty = true;
    return {
      ...employee,
      civility: employee.civility ?? "M",
      matricule: employee.matricule ?? String(1001 + index),
      address: employee.address ?? "",
      postalCode: employee.postalCode ?? "",
      socialSecurityNumber: employee.socialSecurityNumber ?? "",
      category: employee.category ?? "Non Cadre",
      coefficient: employee.coefficient ?? "220",
      classificationIndex: employee.classificationIndex ?? "1.3.1",
      qualification: employee.qualification ?? "",
      contractHours: employee.contractHours ?? store.settings.monthlyHours,
      pasRate: employee.pasRate ?? 0,
      mealTicket5: employee.mealTicket5 ?? 0,
      mealTicket1650: employee.mealTicket1650 ?? 0,
    };
  });
  if (dirty) writeStore(store);
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
