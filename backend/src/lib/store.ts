import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Store } from "../types.js";
import { createSeed } from "./seed.js";

const dataDir = join(dirname(fileURLToPath(import.meta.url)), "../../data");
const storePath = join(dataDir, "store.json");

let cache: Store | null = null;

export function loadStore(): Store {
  if (cache) return cache;
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  if (!existsSync(storePath)) {
    cache = createSeed();
    persist();
    return cache;
  }
  cache = JSON.parse(readFileSync(storePath, "utf8")) as Store;
  return cache;
}

export function persist(): void {
  if (!cache) return;
  writeFileSync(storePath, JSON.stringify(cache, null, 2));
}

export function mutate<T>(fn: (store: Store) => T): T {
  const store = loadStore();
  const result = fn(store);
  persist();
  return result;
}

export function resetStore(): Store {
  cache = createSeed();
  persist();
  return cache;
}

export function id(): string {
  return randomUUID();
}
