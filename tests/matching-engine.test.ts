import test from "node:test";
import assert from "node:assert/strict";

import { runMatchingEngine, type MatchingEngineListing } from "@/lib/matching-engine";

function createListing(
  id: string,
  ownerId: string,
  offer: string,
  wants: string[],
  overrides?: Partial<MatchingEngineListing>
): MatchingEngineListing {
  return {
    id,
    ownerId,
    offer,
    wants,
    city: "Berlin",
    trustScore: 4.5,
    estimatedValue: 100,
    ...overrides,
  };
}

test("engine detects a simple 3-cycle", () => {
  const listings = [
    createListing("a", "u1", "guitar", ["drum"]),
    createListing("b", "u2", "drum", ["keyboard"]),
    createListing("c", "u3", "keyboard", ["guitar"]),
  ];

  const result = runMatchingEngine(listings, { maxCycleLength: 8 });

  assert.equal(result.candidateCycles.length, 1);
  assert.deepEqual(result.selectedCycles[0]?.listingIds, ["a", "b", "c"]);
});

test("engine selects the best set when overlapping cycles compete", () => {
  const listings = [
    createListing("a", "u1", "guitar", ["drum"], { trustScore: 4.9 }),
    createListing("b", "u2", "drum", ["keyboard"], { trustScore: 4.8 }),
    createListing("c", "u3", "keyboard", ["guitar"], { trustScore: 4.7 }),
    createListing("x", "u4", "drum", ["camera"], { trustScore: 2.0, estimatedValue: 90 }),
    createListing("y", "u5", "camera", ["guitar"], { trustScore: 2.0, estimatedValue: 90 }),
    createListing("h", "u6", "vinyl", ["book"], { trustScore: 4.6 }),
    createListing("i", "u7", "book", ["lamp"], { trustScore: 4.6 }),
    createListing("j", "u8", "lamp", ["vinyl"], { trustScore: 4.6 }),
  ];

  const result = runMatchingEngine(listings, { maxCycleLength: 8 });
  const selectedKeys = result.selectedCycles.map((cycle) => cycle.listingIds.join("|"));

  assert.deepEqual(selectedKeys, ["a|b|c", "h|i|j"]);
  assert.ok(result.candidateCycles.some((cycle) => cycle.listingIds.join("|") === "a|x|y"));
});

test("engine handles a larger synthetic network deterministically", () => {
  const listings: MatchingEngineListing[] = [];

  for (let group = 0; group < 12; group += 1) {
    listings.push(
      createListing(`a-${group}`, `owner-a-${group}`, `offer-a-${group}`, [`offer-b-${group}`], {
        trustScore: 4.0 + group * 0.01,
      }),
      createListing(`b-${group}`, `owner-b-${group}`, `offer-b-${group}`, [`offer-c-${group}`], {
        trustScore: 4.1 + group * 0.01,
      }),
      createListing(`c-${group}`, `owner-c-${group}`, `offer-c-${group}`, [`offer-a-${group}`], {
        trustScore: 4.2 + group * 0.01,
      })
    );
  }

  const result = runMatchingEngine(listings, { maxCycleLength: 8 });
  const firstPass = result.selectedCycles.map((cycle) => cycle.listingIds.join("|"));
  const secondPass = runMatchingEngine(listings, { maxCycleLength: 8 }).selectedCycles.map((cycle) =>
    cycle.listingIds.join("|")
  );

  assert.equal(result.selectedCycles.length, 12);
  assert.equal(result.candidateCycles.length, 12);
  assert.deepEqual(firstPass, secondPass);
});
