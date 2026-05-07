import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { canAccessAdminSignals } from "@/lib/admin-access";
import {
  buildMarketplaceSignals,
  type SignalFilters,
} from "@/lib/marketplace-signals";
import {
  readMatchRequestEntries,
  saveMatchRequestEntry,
} from "@/lib/match-request-store";
import type { WaitlistEntry } from "@/lib/waitlist-store";

const waitlistEntries: WaitlistEntry[] = [
  {
    email: "berlin@example.com",
    useCase: "Berlin home office swaps for espresso machine and desk lamp",
    createdAt: "2026-03-14T10:00:00.000Z",
    source: "local",
  },
  {
    email: "potsdam@example.com",
    useCase: "Potsdam students looking for record player and bike helmet trades",
    createdAt: "2026-03-14T11:00:00.000Z",
    source: "local",
  },
];

const matchRequests = [
  {
    have: "espresso machine",
    want: "record player",
    maxHops: 6,
    engine: "graph" as const,
    createdAt: "2026-03-14T10:00:00.000Z",
  },
  {
    have: "desk lamp",
    want: "espresso machine",
    maxHops: 6,
    engine: "legacy" as const,
    createdAt: "2026-03-14T10:05:00.000Z",
  },
  {
    have: "bike helmet",
    want: "record player",
    maxHops: 5,
    engine: "compare" as const,
    createdAt: "2026-03-14T10:10:00.000Z",
  },
];

test("buildMarketplaceSignals summarizes supply, demand, gaps, and clusters", () => {
  const signals = buildMarketplaceSignals({
    waitlistEntries,
    matchRequests,
  });

  assert.equal(signals.topRequestedItems[0]?.label, "Record Player");
  assert.equal(signals.topRequestedItems[0]?.count, 3);
  assert.equal(signals.topOfferedItems[0]?.label, "Bike Helmet");
  assert.equal(signals.topOfferedItems[0]?.count, 1);
  assert.equal(signals.mismatches[0]?.label, "Bike Helmet -> Record Player");
  assert.equal(signals.cityDistribution[0]?.label, "Berlin");
  assert.equal(signals.supplyDemandGaps[0]?.item, "Record Player");
  assert.equal(signals.supplyDemandGaps[0]?.gap, 3);
  assert.ok(
    signals.barterClusters.some((cluster) =>
      cluster.items.includes("Espresso Machine") && cluster.items.includes("Record Player")
    )
  );
});

test("buildMarketplaceSignals applies city and source filters", () => {
  const filters: Partial<SignalFilters> = {
    city: "potsdam",
    source: "all",
  };
  const signals = buildMarketplaceSignals({
    waitlistEntries,
    matchRequests,
    filters,
  });

  assert.equal(signals.totals.filteredMatchRequests, 1);
  assert.equal(signals.totals.filteredWaitlistEntries, 1);
  assert.equal(signals.topRequestedItems[0]?.label, "Record Player");
  assert.equal(signals.cityDistribution[0]?.label, "Potsdam");
});

test("match request store persists to an overridden data directory", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "barterchain-signals-"));
  const env = {
    ...process.env,
    NODE_ENV: "test",
    BARTERCHAIN_DATA_DIR: tempDir,
  };

  try {
    await saveMatchRequestEntry(
      {
        have: "espresso machine",
        want: "record player",
        maxHops: 6,
        engine: "graph",
      },
      env
    );

    const entries = await readMatchRequestEntries(env);
    const fileContent = await readFile(path.join(tempDir, "match-requests.json"), "utf8");

    assert.equal(entries.length, 1);
    assert.match(fileContent, /espresso machine/);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("admin signals access stays open in development and requires a key in production", () => {
  assert.equal(
    canAccessAdminSignals({
      env: { NODE_ENV: "development" } as NodeJS.ProcessEnv,
    }),
    true
  );

  assert.equal(
    canAccessAdminSignals({
      key: "wrong",
      env: {
        NODE_ENV: "production",
        ADMIN_SIGNALS_ACCESS_KEY: "secret",
      } as NodeJS.ProcessEnv,
    }),
    false
  );

  assert.equal(
    canAccessAdminSignals({
      key: "secret",
      env: {
        NODE_ENV: "production",
        ADMIN_SIGNALS_ACCESS_KEY: "secret",
      } as NodeJS.ProcessEnv,
    }),
    true
  );
});
