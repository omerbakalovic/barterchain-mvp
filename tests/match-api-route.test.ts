import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";

import { GET } from "@/app/api/match/route";

const originalDataDir = process.env.BARTERCHAIN_DATA_DIR;
const originalSupabaseUrl = process.env.SUPABASE_URL;
const originalSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const tempDirs: string[] = [];

async function useTempDataDir(seedListings?: string) {
  const dir = await mkdtemp(path.join(os.tmpdir(), "barterchain-match-"));
  tempDirs.push(dir);
  process.env.BARTERCHAIN_DATA_DIR = dir;
  process.env.SUPABASE_URL = "";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "";

  if (seedListings) {
    await writeFile(path.join(dir, "listings.json"), seedListings, "utf8");
  }
}

afterEach(async () => {
  process.env.BARTERCHAIN_DATA_DIR = originalDataDir;
  process.env.SUPABASE_URL = originalSupabaseUrl;
  process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseKey;

  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("api match can use the graph engine behind a request flag", async () => {
  await useTempDataDir();

  const response = await GET(
    new Request(
      "http://localhost:3000/api/match?have=espresso%20machine&want=record%20player&maxHops=6&engine=graph"
    )
  );
  const payload = (await response.json()) as {
    mode: string;
    have: string;
    want: string;
    maxHops: number;
    totalListings: number;
    chainCount: number;
    chains: Array<{
      summary: string;
      returnItem: string;
      reasons: string[];
      listings: Array<{ id: string }>;
    }>;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.mode, "trade-request");
  assert.equal(payload.have, "espresso machine");
  assert.equal(payload.want, "record player");
  assert.equal(payload.maxHops, 6);
  assert.equal(payload.totalListings, 8);
  assert.ok(payload.chainCount > 0);
  assert.equal(payload.chains[0]?.returnItem, "record player");
  assert.ok(payload.chains[0]?.reasons.includes("exact return item match"));
  assert.equal(payload.chains[0]?.listings[0]?.id, "lena-espresso");
});

test("api match compare mode returns side-by-side legacy and graph metrics", async () => {
  await useTempDataDir();

  const response = await GET(
    new Request(
      "http://localhost:3000/api/match?have=espresso%20machine&want=record%20player&maxHops=6&engine=compare"
    )
  );
  const payload = (await response.json()) as {
    mode: string;
    engine: string;
    have: string;
    want: string;
    maxHops: number;
    totalListings: number;
    comparison: {
      legacy: {
        candidateChainCount: number;
        selectedChainCount: number;
        averageCandidateScore: number;
        averageSelectedScore: number;
        durationMs: number;
        summaryMetrics: {
          coverage: number;
          disjointChainCount: number;
          averageChainQuality: number;
          trustAverage: number;
          valueFairness: number;
        };
        candidateChains: Array<{ listings: Array<{ id: string }> }>;
        selectedChains: Array<{ listings: Array<{ id: string }> }>;
      };
      graph: {
        candidateChainCount: number;
        selectedChainCount: number;
        averageCandidateScore: number;
        averageSelectedScore: number;
        durationMs: number;
        summaryMetrics: {
          coverage: number;
          disjointChainCount: number;
          averageChainQuality: number;
          trustAverage: number;
          valueFairness: number;
        };
        candidateChains: Array<{ listings: Array<{ id: string }> }>;
        selectedChains: Array<{ listings: Array<{ id: string }> }>;
      };
      differences: {
        candidateOnlyInLegacy: string[];
        candidateOnlyInGraph: string[];
        selectedOnlyInLegacy: string[];
        selectedOnlyInGraph: string[];
        scoreMismatches: Array<{ chain: string; delta: number }>;
        graphBetterOn: string[];
        legacyBetterOn: string[];
      };
    };
  };

  assert.equal(response.status, 200);
  assert.equal(payload.mode, "trade-request");
  assert.equal(payload.engine, "compare");
  assert.equal(payload.totalListings, 8);
  assert.ok(payload.comparison.legacy.candidateChainCount > 0);
  assert.ok(payload.comparison.graph.candidateChainCount > 0);
  assert.ok(
    payload.comparison.legacy.selectedChainCount <= payload.comparison.legacy.candidateChainCount
  );
  assert.ok(
    payload.comparison.graph.selectedChainCount <= payload.comparison.graph.candidateChainCount
  );
  assert.equal(
    payload.comparison.legacy.candidateChains[0]?.listings[0]?.id,
    "lena-espresso"
  );
  assert.equal(
    payload.comparison.graph.candidateChains[0]?.listings[0]?.id,
    "lena-espresso"
  );
  assert.ok(Array.isArray(payload.comparison.differences.scoreMismatches));
  assert.ok(payload.comparison.legacy.summaryMetrics.coverage > 0);
  assert.equal(
    payload.comparison.legacy.summaryMetrics.disjointChainCount,
    payload.comparison.graph.summaryMetrics.disjointChainCount
  );
});

test("api match includes stored listings in the matcher dataset", async () => {
  await useTempDataDir(
    JSON.stringify(
      [
        {
          id: "vinyl-swap-1",
          title: "Vinyl collector",
          description: "Clean record player available for local barter in Berlin.",
          category: "Audio",
          valueEstimate: 120,
          city: "Berlin",
          trustScore: 4.7,
          gives: "record player",
          wants: ["espresso machine"],
          createdAt: "2026-03-14T12:00:00.000Z",
          source: "local",
        },
      ],
      null,
      2
    )
  );

  const response = await GET(
    new Request(
      "http://localhost:3000/api/match?have=espresso%20machine&want=record%20player&maxHops=6&engine=legacy"
    )
  );
  const payload = (await response.json()) as {
    totalListings: number;
    usingStoredListings: boolean;
    chains: Array<{ listings: Array<{ id: string }> }>;
  };

  assert.equal(response.status, 200);
  assert.equal(payload.totalListings, 9);
  assert.equal(payload.usingStoredListings, true);
  assert.ok(payload.chains.some((chain) => chain.listings.some((listing) => listing.id === "vinyl-swap-1")));
});
