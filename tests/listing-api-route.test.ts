import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";

import { GET, POST } from "@/app/api/listings/route";

const originalDataDir = process.env.BARTERCHAIN_DATA_DIR;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tempDirs: string[] = [];

async function useTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-listings-"));
  tempDirs.push(dir);
  process.env.BARTERCHAIN_DATA_DIR = dir;
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  return dir;
}

afterEach(async () => {
  process.env.BARTERCHAIN_DATA_DIR = originalDataDir;
  process.env.SUPABASE_URL = originalSupabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseKey;

  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("listings api creates and returns stored listings", async () => {
  const dir = await useTempDataDir();

  const createResponse = await POST(
    new Request("http://localhost:3000/api/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Vintage road bike",
        description: "Steel frame commuter bike with lights and fresh tires.",
        category: "Mobility",
        valueEstimate: 180,
        city: "Berlin",
        trustScore: 4.5,
        gives: "road bike",
        wants: "record player, espresso machine",
        ownerName: "Lena",
        ownerContact: "lena@example.com",
      }),
    })
  );

  const createdPayload = (await createResponse.json()) as {
    source: string;
    listing: {
      id: string;
      title: string;
      wants: string[];
      source: string;
    };
  };

  assert.equal(createResponse.status, 201);
  assert.equal(createdPayload.source, "local");
  assert.equal(createdPayload.listing.title, "Vintage road bike");
  assert.deepEqual(createdPayload.listing.wants, ["record player", "espresso machine"]);

  const fileContent = await readFile(path.join(dir, "listings.json"), "utf8");
  const savedListings = JSON.parse(fileContent) as Array<{ title: string }>;
  assert.equal(savedListings.length, 1);
  assert.equal(savedListings[0]?.title, "Vintage road bike");

  const listResponse = await GET();
  const listPayload = (await listResponse.json()) as {
    count: number;
    listings: Array<{ id: string; title: string }>;
  };

  assert.equal(listResponse.status, 200);
  assert.equal(listPayload.count, 1);
  assert.equal(listPayload.listings[0]?.id, createdPayload.listing.id);
  assert.equal(listPayload.listings[0]?.title, "Vintage road bike");
});

test("listings api rejects invalid payloads", async () => {
  await useTempDataDir();

  const response = await POST(
    new Request("http://localhost:3000/api/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "No",
        description: "Too short",
        category: "",
        valueEstimate: 0,
        city: "",
        trustScore: 9,
        gives: "",
        wants: "",
      }),
    })
  );

  const payload = (await response.json()) as {
    message: string;
    errors: string[];
  };

  assert.equal(response.status, 400);
  assert.ok(payload.errors.length > 0);
  assert.equal(payload.message, payload.errors[0]);
});
