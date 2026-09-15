import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "../types.js";
import { buildUsers, createSeed } from "./seed.js";

const dataDir = process.env.DATA_DIR ?? join(dirname(fileURLToPath(import.meta.url)), "../../data");
const storePath = join(dataDir, "store.json");

function writeStore(store: Store): void {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  writeFileSync(storePath, JSON.stringify(store, null, 2));
}

export function loadStore(): Store {
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

export function mutate<T>(fn: (store: Store) => T): T {
  const store = loadStore();
  const result = fn(store);
  writeStore(store);
  return result;
}

export function resetStore(): Store {
  const seeded = createSeed();
  writeStore(seeded);
  return seeded;
}

export function id(): string {
  return randomUUID();
}
