import test from "node:test";
import assert from "node:assert/strict";

import { demoListings } from "@/lib/barter-data";
import {
  buildChainMetrics,
  buildWhyThisMatch,
  formatComparisonWinner,
  getChainCityAlignment,
  getChainValueFairness,
} from "@/lib/match-results";

const sampleChain = {
  listings: [
    demoListings[0],
    demoListings[1],
    demoListings[3],
  ],
  hopCount: 3,
  score: 92.4,
  summary: "Lena gives espresso machine to Samir -> Samir gives desk lamp to Mira -> Mira gives record player to Lena",
  returnItem: "record player",
  reasons: [
    "exact return item match",
    "2 trader(s) in the same city as the starter",
    "average trust score 4.7",
    "value spread 95 EUR",
    "3-hop chain",
  ],
};

test("buildChainMetrics derives the user-facing metric bars", () => {
  const metrics = buildChainMetrics(sampleChain, 6);

  assert.equal(metrics.length, 5);
  assert.equal(metrics[0]?.label, "Score");
  assert.equal(metrics[1]?.display, "4.7 / 5");
  assert.equal(metrics[2]?.display, "32%");
  assert.equal(metrics[3]?.display, "100%");
  assert.equal(metrics[4]?.display, "3 hops");
});

test("why-this-match explanations surface exact fit and execution tradeoffs", () => {
  const insights = buildWhyThisMatch(sampleChain, 6);

  assert.ok(insights.some((entry) => entry.title === "Return item fit"));
  assert.ok(insights.some((entry) => entry.title === "Trust strength"));
  assert.ok(insights.some((entry) => entry.title === "Execution complexity"));
  assert.match(insights[0]?.body ?? "", /record player/);
});

test("match result helpers compute fairness and city alignment consistently", () => {
  assert.equal(Math.round(getChainValueFairness(sampleChain)), 32);
  assert.equal(Math.round(getChainCityAlignment(sampleChain)), 100);
});

test("comparison winner labels remain readable for ties and wins", () => {
  assert.equal(formatComparisonWinner("Coverage", "tie", 0), "Coverage is tied");
  assert.equal(
    formatComparisonWinner("Value fairness", "graph", 4.5),
    "Graph leads on Value fairness (+4.50)"
  );
});

