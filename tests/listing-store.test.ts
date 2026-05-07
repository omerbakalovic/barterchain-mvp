import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";

import { demoListings } from "@/lib/barter-data";
import {
  readMatcherListings,
  readStoredListings,
  saveListing,
} from "@/lib/listing-store";
import { type ListingInput } from "@/lib/listings";

const tempDirs: string[] = [];

async function makeTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-listing-store-"));
  tempDirs.push(dir);
  const env: NodeJS.ProcessEnv = { ...process.env, BARTERCHAIN_DATA_DIR: dir };
  delete env.SUPABASE_URL;
  delete env.SUPABASE_SERVICE_ROLE_KEY;
  return { dir, env };
}

function buildListingInput(overrides: Partial<ListingInput> = {}): ListingInput {
  return {
    title: "Vintage telescope",
    description: "Brass telescope in good shape, complete with tripod.",
    category: "optics",
    valueEstimate: 250,
    city: "Sarajevo",
    trustScore: 4.5,
    gives: "vintage telescope",
    wants: ["mountain bike"],
    ...overrides,
  };
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("saveListing falls back to local JSON when Supabase env vars are unset", async () => {
  const { dir, env } = await makeTempDataDir();
  const stored = await saveListing(buildListingInput(), env);

  assert.equal(stored.source, "local");
  assert.match(stored.id, /^vintage-telescope-/);
  assert.equal(stored.gives, "vintage telescope");

  const fileContent = await readFile(path.join(dir, "listings.json"), "utf8");
  const persisted = JSON.parse(fileContent) as Array<{ id: string; source: string }>;
  assert.equal(persisted.length, 1);
  assert.equal(persisted[0]?.id, stored.id);
});

test("saveListing creates the data directory when it does not yet exist", async () => {
  const { dir, env } = await makeTempDataDir();
  const nestedDir = path.join(dir, "nested", "subfolder");
  env.BARTERCHAIN_DATA_DIR = nestedDir;

  await saveListing(buildListingInput(), env);
  const dirStats = await stat(nestedDir);
  assert.ok(dirStats.isDirectory());
});

test("readStoredListings returns previously saved entries", async () => {
  const { env } = await makeTempDataDir();
  const first = await saveListing(buildListingInput({ title: "Acoustic guitar", gives: "acoustic guitar" }), env);
  const second = await saveListing(buildListingInput({ title: "Espresso machine", gives: "espresso machine" }), env);

  const all = await readStoredListings(env);
  assert.equal(all.length, 2);
  assert.deepEqual(
    all.map((entry) => entry.id).sort(),
    [first.id, second.id].sort()
  );
});

test("readStoredListings returns an empty array when no file exists", async () => {
  const { env } = await makeTempDataDir();
  const all = await readStoredListings(env);
  assert.deepEqual(all, []);
});

test("readMatcherListings returns demoListings only when no entries are stored", async () => {
  const { env } = await makeTempDataDir();
  const listings = await readMatcherListings(env);
  assert.deepEqual(listings, demoListings);
});

test("readMatcherListings appends adapted stored listings to the demo set", async () => {
  const { env } = await makeTempDataDir();
  const stored = await saveListing(buildListingInput(), env);

  const listings = await readMatcherListings(env);
  assert.equal(listings.length, demoListings.length + 1);

  const adapted = listings.find((listing) => listing.id === stored.id);
  assert.ok(adapted, "saved listing should appear in matcher listings");
  assert.equal(adapted?.gives, "vintage telescope");
  assert.equal(adapted?.shipping, "local-only");
  assert.equal(adapted?.condition, "good");
});
