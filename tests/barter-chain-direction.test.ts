import test from "node:test";
import assert from "node:assert/strict";

import { type BarterListing } from "@/lib/barter-data";
import { enumerateChainsForListingInListings } from "@/lib/barter-match";
import { compareMarketplaceMatchEngines } from "@/lib/match-comparison";
import { enumerateGraphCompatibleChainsForListing } from "@/lib/matching-engine/compat";

function listing(id: string, gives: string, wants: string[]): BarterListing {
  return {
    id, trader: id, city: "Berlin", gives, wants,
    category: "Other", categorySlug: "other", condition: "good",
    estimatedValue: 100, shipping: "domestic", trustScore: 4,
  };
}

const threeWay = [
  listing("A", "bike", ["drill"]),
  listing("B", "drill", ["monitor"]),
  listing("C", "monitor", ["bike"]),
];

for (const [name, enumerate] of [
  ["legacy", enumerateChainsForListingInListings],
  ["graph", enumerateGraphCompatibleChainsForListing],
] as const) {
  test(`${name} describes transfers to the participants who want each item`, () => {
    const chains = enumerate(threeWay, "A", 3);
    assert.equal(chains.length, 1);
    assert.deepEqual(chains[0].listings.map((entry) => entry.id), ["A", "B", "C"]);
    assert.equal(chains[0].chainId, "A|B|C");
    assert.equal(chains[0].summary,
      "A gives bike to C -> B gives drill to A -> C gives monitor to B");
  });

  test(`${name} awards the desired-item bonus only for what the starter receives`, () => {
    const matching = enumerate(threeWay, "A", 3, " DRILL ")[0];
    const nonmatching = enumerate(threeWay, "A", 3, "monitor")[0];
    assert.equal(matching.returnItem, "drill");
    assert.equal(nonmatching.returnItem, "drill");
    assert.ok(matching.reasons.includes("exact return item match"));
    assert.ok(!nonmatching.reasons.includes("exact return item match"));
    assert.equal(matching.score - nonmatching.score, 60);
  });

  test(`${name} keeps four-way transfers correct when the starter changes`, () => {
    const fourWay = [
      listing("A", "bike", ["drill"]),
      listing("B", "drill", ["monitor"]),
      listing("C", "monitor", ["camera"]),
      listing("D", "camera", ["bike"]),
    ];
    const expectedTransfers = [
      "A gives bike to D", "B gives drill to A",
      "C gives monitor to B", "D gives camera to C",
    ].sort();
    for (const starter of fourWay) {
      const chains = enumerate(fourWay, starter.id, 4);
      assert.equal(chains.length, 1);
      assert.equal(chains[0].listings[0].id, starter.id);
      assert.equal(chains[0].returnItem, starter.wants[0]);
      assert.deepEqual(chains[0].summary.split(" -> ").sort(), expectedTransfers);
    }
  });
}

test("marketplace comparison projects actual received items in both engines", () => {
  const result = compareMarketplaceMatchEngines({ listings: threeWay, maxHops: 3 });
  for (const engine of [result.legacy, result.graph]) {
    assert.equal(engine.candidateChains.length, 1);
    assert.equal(engine.selectedChains.length, 1);
    for (const chain of [...engine.candidateChains, ...engine.selectedChains]) {
      assert.equal(chain.returnItem, chain.listings[0].wants[0]);
      assert.deepEqual(chain.summary.split(" -> ").sort(), [
        "A gives bike to C", "B gives drill to A", "C gives monitor to B",
      ]);
    }
  }
});
