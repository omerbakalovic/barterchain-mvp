import { performance } from "node:perf_hooks";

import { runMatchingEngine, type MatchingEngineListing } from "@/lib/matching-engine";

function createSyntheticNetwork(groupCount: number, overlapStride: number): MatchingEngineListing[] {
  const listings: MatchingEngineListing[] = [];

  for (let group = 0; group < groupCount; group += 1) {
    const suffix = `${group}`;
    listings.push(
      {
        id: `a-${suffix}`,
        ownerId: `owner-a-${suffix}`,
        offer: `offer-a-${suffix}`,
        wants: [`offer-b-${suffix}`],
        city: group % 2 === 0 ? "Berlin" : "Hamburg",
        trustScore: 4.2,
        estimatedValue: 100,
      },
      {
        id: `b-${suffix}`,
        ownerId: `owner-b-${suffix}`,
        offer: `offer-b-${suffix}`,
        wants: [`offer-c-${suffix}`],
        city: group % 2 === 0 ? "Berlin" : "Hamburg",
        trustScore: 4.1,
        estimatedValue: 102,
      },
      {
        id: `c-${suffix}`,
        ownerId: `owner-c-${suffix}`,
        offer: `offer-c-${suffix}`,
        wants: [`offer-a-${suffix}`],
        city: group % 2 === 0 ? "Berlin" : "Hamburg",
        trustScore: 4.3,
        estimatedValue: 101,
      }
    );
  }

  for (let index = 0; index < groupCount - overlapStride; index += 1) {
    listings.push({
      id: `x-${index}`,
      ownerId: `owner-x-${index}`,
      offer: `offer-x-${index}`,
      wants: [`offer-b-${index}`, `offer-a-${index + overlapStride}`],
      city: "Berlin",
      trustScore: 3.8,
      estimatedValue: 95,
    });
  }

  return listings;
}

for (const groupCount of [20, 40, 80]) {
  const listings = createSyntheticNetwork(groupCount, 3);
  const startedAt = performance.now();
  const result = runMatchingEngine(listings, { maxCycleLength: 8 });
  const durationMs = Number((performance.now() - startedAt).toFixed(2));

  console.log(
    JSON.stringify({
      groupCount,
      listings: listings.length,
      candidateCycles: result.candidateCycles.length,
      selectedCycles: result.selectedCycles.length,
      durationMs,
    })
  );
}
