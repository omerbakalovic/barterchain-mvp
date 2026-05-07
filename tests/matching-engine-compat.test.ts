import test from "node:test";
import assert from "node:assert/strict";

import { demoListings } from "@/lib/barter-data";
import { findChainsForListing, findChainsForTradeRequest } from "@/lib/barter-match";
import {
  findGraphCompatibleChainsForListing,
  findGraphCompatibleChainsForTradeRequest,
} from "@/lib/matching-engine/compat";

test("graph compatibility layer preserves the legacy chain shape for listing lookups", () => {
  const legacy = findChainsForListing("lena-espresso", 6, 6);
  const graph = findGraphCompatibleChainsForListing(demoListings, "lena-espresso", 6, 6);

  assert.ok(graph.length > 0);
  assert.deepEqual(
    Object.keys(graph[0] ?? {}).sort(),
    ["chainId", "hopCount", "listings", "reasons", "returnItem", "score", "summary"]
  );
  assert.equal(graph[0]?.listings[0]?.id, "lena-espresso");
  assert.equal(graph[0]?.summary, legacy[0]?.summary);
  assert.equal(graph[0]?.returnItem, legacy[0]?.returnItem);
});

test("graph compatibility layer keeps desired return-item ranking signals", () => {
  const legacy = findChainsForTradeRequest({
    have: "espresso machine",
    want: "record player",
    maxHops: 6,
    limit: 6,
  });
  const graph = findGraphCompatibleChainsForTradeRequest({
    listings: demoListings,
    have: "espresso machine",
    want: "record player",
    maxHops: 6,
    limit: 6,
  });

  assert.ok(graph.length > 0);
  assert.equal(graph[0]?.returnItem, "record player");
  assert.ok(graph[0]?.reasons.includes("exact return item match"));
  assert.equal(graph[0]?.summary, legacy[0]?.summary);
});

