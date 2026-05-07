import test from "node:test";
import assert from "node:assert/strict";

import { findChainsForListing, findChainsForTradeRequest } from "@/lib/barter-match";

test("findChainsForListing returns valid cycles without duplicate traders", () => {
  const chains = findChainsForListing("lena-espresso", 6, 6);

  assert.ok(chains.length > 0);

  for (const chain of chains) {
    assert.ok(chain.hopCount >= 3);
    assert.equal(chain.listings.length, chain.hopCount);

    const traders = chain.listings.map((listing) => listing.trader);
    assert.equal(new Set(traders).size, traders.length);
  }
});

test("findChainsForTradeRequest prefers the exact desired return item", () => {
  const chains = findChainsForTradeRequest({
    have: "espresso machine",
    want: "record player",
    maxHops: 6,
    limit: 3,
  });

  assert.ok(chains.length > 0);
  assert.equal(chains[0]?.returnItem, "record player");
  assert.ok(chains[0]?.reasons.includes("exact return item match"));
});

test("findChainsForTradeRequest respects the requested hop limit", () => {
  const chains = findChainsForTradeRequest({
    have: "camera tripod",
    want: "bike helmet",
    maxHops: 4,
    limit: 10,
  });

  assert.ok(chains.every((chain) => chain.hopCount <= 4));
});
