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
  if (!store.users?.length) {
    store.users = buildUsers(store.employees);
    writeStore(store);
  }
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
