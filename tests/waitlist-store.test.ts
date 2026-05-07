import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";

import {
  readWaitlistEntries,
  saveWaitlistEntry,
  type WaitlistEntry,
} from "@/lib/waitlist-store";

const tempDirs: string[] = [];

async function makeTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-waitlist-store-"));
  tempDirs.push(dir);
  const env: NodeJS.ProcessEnv = { ...process.env, BARTERCHAIN_DATA_DIR: dir };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  return { dir, env };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("saveWaitlistEntry falls back to local JSON when Supabase env vars are unset", async () => {
  const { dir, env } = await makeTempDataDir();
  const stored = await saveWaitlistEntry(
    { email: "berlin@example.com", useCase: "Trading espresso machines in Berlin" },
    env
  );

  assert.equal(stored.source, "local");
  assert.equal(stored.email, "berlin@example.com");
  assert.equal(stored.useCase, "Trading espresso machines in Berlin");
  assert.ok(stored.createdAt);

  const fileContent = await readFile(path.join(dir, "waitlist.json"), "utf8");
  const persisted = JSON.parse(fileContent) as WaitlistEntry[];
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0]?.email, stored.email);
  assert.equal(persisted[0]?.source, "local");
});

test("saveWaitlistEntry creates the data directory when it does not yet exist", async () => {
  const { dir, env } = await makeTempDataDir();
  const nestedDir = path.join(dir, "nested", "subfolder");
  env.BARTERCHAIN_DATA_DIR = nestedDir;

  await saveWaitlistEntry({ email: "potsdam@example.com", useCase: "Bike helmet swap" }, env);
  const dirStats = await stat(nestedDir);
  assert.ok(dirStats.isDirectory());
});

test("readWaitlistEntries returns previously saved entries", async () => {
  const { env } = await makeTempDataDir();
  await saveWaitlistEntry({ email: "a@example.com", useCase: "Looking for a record player" }, env);
  await saveWaitlistEntry({ email: "b@example.com", useCase: "Offering a desk lamp" }, env);

  const all = await readWaitlistEntries(env);
  assert.equal(all.length, 2);
  assert.deepEqual(
    all.map((entry) => entry.email).sort(),
    ["a@example.com", "b@example.com"]
  );
  assert.ok(all.every((entry) => entry.source === "local"));
});

test("readWaitlistEntries returns an empty array when no file exists", async () => {
  const { env } = await makeTempDataDir();
  const all = await readWaitlistEntries(env);
  assert.deepEqual(all, []);
});
