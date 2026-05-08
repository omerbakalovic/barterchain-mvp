import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm } from "node:fs/promises";

import { POST as createListing } from "@/app/api/listings/route";
import { POST as deposit } from "@/app/api/listings/[id]/deposit/route";
import { POST as release } from "@/app/api/listings/[id]/release/route";
import { BUFFER_DAILY_FEE_EUR } from "@/lib/buffer";

const originalDataDir = process.env.BARTERCHAIN_DATA_DIR;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tempDirs: string[] = [];

async function useTempDataDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-buffer-api-"));
  tempDirs.push(dir);
  process.env.BARTERCHAIN_DATA_DIR = dir;
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";
  return dir;
}

async function createSampleListing() {
  const response = await createListing(
    new Request("http://localhost:3000/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "Vintage road bike",
        description: "Steel frame commuter bike with lights and fresh tires.",
        category: "Mobility",
        valueEstimate: 180,
        city: "Berlin",
        trustScore: 4.5,
        gives: "road bike",
        wants: "record player, espresso machine",
      }),
    })
  );

  assert.equal(response.status, 201);
  const body = (await response.json()) as { listing: { id: string } };
  return body.listing.id;
}

function buildDepositRequest(id: string, body: Record<string, unknown>) {
  return [
    new Request(`http://localhost:3000/api/listings/${id}/deposit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  ] as const;
}

function buildReleaseRequest(id: string, body: Record<string, unknown>) {
  return [
    new Request(`http://localhost:3000/api/listings/${id}/release`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  ] as const;
}

afterEach(async () => {
  process.env.BARTERCHAIN_DATA_DIR = originalDataDir;
  process.env.SUPABASE_URL = originalSupabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseKey;

  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("deposit then release writes the buffer lifecycle to disk and returns the accrued fee", async () => {
  const dir = await useTempDataDir();
  const id = await createSampleListing();

  const depositResponse = await deposit(...buildDepositRequest(id, { sizeClass: "M", note: "drop-off" }));
  assert.equal(depositResponse.status, 200);
  const depositBody = (await depositResponse.json()) as {
    listing: { id: string; buffer: { status: string; sizeClass: string; depositedAt: string } };
  };
  assert.equal(depositBody.listing.buffer.status, "deposited");
  assert.equal(depositBody.listing.buffer.sizeClass, "M");
  assert.match(depositBody.listing.buffer.depositedAt, /^\d{4}-/);

  const fileContent = await readFile(path.join(dir, "listings.json"), "utf8");
  const persisted = JSON.parse(fileContent) as Array<{ buffer?: { status: string } }>;
  assert.equal(persisted[0]?.buffer?.status, "deposited");

  const releaseResponse = await release(...buildReleaseRequest(id, { reason: "shipped" }));
  assert.equal(releaseResponse.status, 200);
  const releaseBody = (await releaseResponse.json()) as {
    listing: { buffer: { status: string; releasedAt: string | null } };
    accruedFeeEur: number;
    reason: string;
  };
  assert.equal(releaseBody.listing.buffer.status, "shipped");
  assert.match(releaseBody.listing.buffer.releasedAt ?? "", /^\d{4}-/);
  assert.equal(releaseBody.reason, "shipped");
  assert.ok(releaseBody.accruedFeeEur >= 0);
  assert.ok(releaseBody.accruedFeeEur < BUFFER_DAILY_FEE_EUR.M);
});

test("deposit returns 404 for an unknown listing id", async () => {
  await useTempDataDir();
  const response = await deposit(
    ...buildDepositRequest("does-not-exist", { sizeClass: "S" })
  );
  assert.equal(response.status, 404);
});

test("deposit rejects an invalid size class", async () => {
  await useTempDataDir();
  const id = await createSampleListing();
  const response = await deposit(...buildDepositRequest(id, { sizeClass: "ENORMOUS" }));
  assert.equal(response.status, 400);
});

test("deposit rejects a second deposit on the same listing", async () => {
  await useTempDataDir();
  const id = await createSampleListing();
  const first = await deposit(...buildDepositRequest(id, { sizeClass: "M" }));
  assert.equal(first.status, 200);

  const second = await deposit(...buildDepositRequest(id, { sizeClass: "M" }));
  assert.equal(second.status, 409);
});

test("deposit rejects when the size class disagrees with the existing buffer state", async () => {
  await useTempDataDir();
  const id = await createSampleListing();
  await deposit(...buildDepositRequest(id, { sizeClass: "M" }));

  const conflict = await deposit(...buildDepositRequest(id, { sizeClass: "L" }));
  assert.equal(conflict.status, 409);
});

test("release returns 409 when the listing was never deposited", async () => {
  await useTempDataDir();
  const id = await createSampleListing();
  const response = await release(...buildReleaseRequest(id, { reason: "shipped" }));
  assert.equal(response.status, 409);
});

test("release rejects an invalid reason", async () => {
  await useTempDataDir();
  const id = await createSampleListing();
  await deposit(...buildDepositRequest(id, { sizeClass: "S" }));

  const response = await release(...buildReleaseRequest(id, { reason: "incinerated" }));
  assert.equal(response.status, 400);
});

test("release supports the withdrawn outcome too", async () => {
  await useTempDataDir();
  const id = await createSampleListing();
  await deposit(...buildDepositRequest(id, { sizeClass: "S" }));

  const response = await release(...buildReleaseRequest(id, { reason: "withdrawn" }));
  assert.equal(response.status, 200);
  const body = (await response.json()) as {
    listing: { buffer: { status: string } };
    reason: string;
  };
  assert.equal(body.listing.buffer.status, "withdrawn");
  assert.equal(body.reason, "withdrawn");
});
