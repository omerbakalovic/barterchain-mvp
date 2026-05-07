import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";

import {
  readMatchRequestEntries,
  saveMatchRequestEntry,
} from "@/lib/match-request-store";

const tempDirs: string[] = [];

async function makeTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-match-req-"));
  tempDirs.push(dir);
  return dir;
}

function buildEntry(overrides: Partial<{ have: string; want: string; maxHops: number; engine: "legacy" | "graph" | "compare" }> = {}) {
  return {
    have: "espresso machine",
    want: "record player",
    maxHops: 6,
    engine: "graph" as const,
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("saveMatchRequestEntry is a no-op under NODE_ENV=test without BARTERCHAIN_DATA_DIR", async () => {
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test" };
  delete env.BARTERCHAIN_DATA_DIR;

  const result = await saveMatchRequestEntry(buildEntry(), env);
  assert.equal(result, null);
});

test("saveMatchRequestEntry persists when BARTERCHAIN_DATA_DIR is provided in test mode", async () => {
  const dir = await makeTempDataDir();
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test", BARTERCHAIN_DATA_DIR: dir };

  const result = await saveMatchRequestEntry(buildEntry(), env);
  assert.ok(result);
  assert.equal(result?.have, "espresso machine");
  assert.equal(result?.engine, "graph");
  assert.match(result?.createdAt ?? "", /^\d{4}-\d{2}-\d{2}T/);

  const fileContent = await readFile(path.join(dir, "match-requests.json"), "utf8");
  const persisted = JSON.parse(fileContent) as Array<{ have: string }>;
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0]?.have, "espresso machine");
});

test("saveMatchRequestEntry appends to existing entries in order", async () => {
  const dir = await makeTempDataDir();
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test", BARTERCHAIN_DATA_DIR: dir };

  await saveMatchRequestEntry(buildEntry({ have: "first", want: "alpha" }), env);
  await saveMatchRequestEntry(buildEntry({ have: "second", want: "beta", engine: "legacy" }), env);
  await saveMatchRequestEntry(buildEntry({ have: "third", want: "gamma", engine: "compare" }), env);

  const entries = await readMatchRequestEntries(env);
  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map((entry) => entry.have),
    ["first", "second", "third"]
  );
  assert.deepEqual(
    entries.map((entry) => entry.engine),
    ["graph", "legacy", "compare"]
  );
});

test("readMatchRequestEntries returns an empty array when no file exists", async () => {
  const dir = await makeTempDataDir();
  const env: NodeJS.ProcessEnv = { ...process.env, NODE_ENV: "test", BARTERCHAIN_DATA_DIR: dir };

  const entries = await readMatchRequestEntries(env);
  assert.deepEqual(entries, []);
});
