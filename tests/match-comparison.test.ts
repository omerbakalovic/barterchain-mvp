import test from "node:test";
import assert from "node:assert/strict";

import { matchingEvaluationFixtures, type MatchingEvaluationScenario } from "@/lib/matching-evaluation-fixtures";
import {
  enumerateChainsForListingInListings,
  enumerateChainsForTradeRequestInListings,
} from "@/lib/barter-match";
import {
  compareListingMatchEngines,
  compareMarketplaceMatchEngines,
  compareTradeRequestMatchEngines,
} from "@/lib/match-comparison";

function getListingScenario(scenarios: MatchingEvaluationScenario[]) {
  const scenario = scenarios.find((entry) => entry.kind === "listing");
  assert.ok(scenario);
  return scenario;
}

function getTradeScenario(scenarios: MatchingEvaluationScenario[]) {
  const scenario = scenarios.find((entry) => entry.kind === "trade-request");
  assert.ok(scenario);
  return scenario;
}

function getFixture(name: string) {
  const fixture = matchingEvaluationFixtures.find((entry) => entry.name === name);
  assert.ok(fixture);
  return fixture;
}

test("legacy matcher can enumerate chains against arbitrary evaluation fixtures", () => {
  const fixture = matchingEvaluationFixtures[0];
  const listingScenario = getListingScenario(fixture.scenarios);
  const tradeScenario = getTradeScenario(fixture.scenarios);

  const listingChains = enumerateChainsForListingInListings(
    fixture.listings,
    listingScenario.listingId,
    listingScenario.maxHops
  );
  const tradeChains = enumerateChainsForTradeRequestInListings(fixture.listings, {
    have: tradeScenario.have,
    want: tradeScenario.want,
    maxHops: tradeScenario.maxHops,
  });

  assert.ok(listingChains.length > 0);
  assert.ok(tradeChains.length > 0);
  assert.equal(listingChains[0]?.listings[0]?.id, listingScenario.listingId);
});

test("comparison helpers return side-by-side metrics for listing and trade scenarios", () => {
  const fixture = getFixture("overlapping-competition");
  const listingScenario = getListingScenario(fixture.scenarios);
  const tradeScenario = getTradeScenario(fixture.scenarios);

  const listingComparison = compareListingMatchEngines({
    listings: fixture.listings,
    listingId: listingScenario.listingId,
    maxHops: listingScenario.maxHops,
  });
  const tradeComparison = compareTradeRequestMatchEngines({
    listings: fixture.listings,
    have: tradeScenario.have,
    want: tradeScenario.want,
    maxHops: tradeScenario.maxHops,
  });

  assert.ok(listingComparison.legacy.candidateChainCount > 0);
  assert.ok(listingComparison.graph.candidateChainCount > 0);
  assert.ok(tradeComparison.legacy.selectedChainCount >= 0);
  assert.ok(tradeComparison.graph.selectedChainCount >= 0);
  assert.ok(Array.isArray(listingComparison.differences.candidateOnlyInLegacy));
  assert.ok(Array.isArray(tradeComparison.differences.scoreMismatches));
  assert.equal(listingComparison.legacy.summaryMetrics.disjointChainCount, 1);
  assert.equal(listingComparison.graph.summaryMetrics.coverage, listingComparison.legacy.summaryMetrics.coverage);
});

test("marketplace comparison exposes graph-native gains on the synthetic network", () => {
  const fixture = getFixture("synthetic-mixed-network");
  assert.ok(fixture.market);

  const comparison = compareMarketplaceMatchEngines({
    listings: fixture.listings,
    maxHops: fixture.market.maxHops,
  });

  assert.equal(comparison.legacy.candidateChainCount, comparison.graph.candidateChainCount);
  assert.ok(comparison.graph.summaryMetrics.coverage > comparison.legacy.summaryMetrics.coverage);
  assert.ok(comparison.graph.summaryMetrics.trustAverage > comparison.legacy.summaryMetrics.trustAverage);
  assert.ok(comparison.graph.summaryMetrics.valueFairness > comparison.legacy.summaryMetrics.valueFairness);
  assert.ok(comparison.differences.graphBetterOn.includes("coverage"));
  assert.ok(comparison.differences.selectedOnlyInGraph.length > 0);
});

test("marketplace comparison can also show legitimate ties on sparse disconnected markets", () => {
  const fixture = getFixture("sparse-dead-ends-market");
  assert.ok(fixture.market);

  const comparison = compareMarketplaceMatchEngines({
    listings: fixture.listings,
    maxHops: fixture.market.maxHops,
  });

  assert.equal(comparison.legacy.summaryMetrics.coverage, comparison.graph.summaryMetrics.coverage);
  assert.equal(comparison.legacy.summaryMetrics.disjointChainCount, comparison.graph.summaryMetrics.disjointChainCount);
  assert.deepEqual(comparison.differences.graphBetterOn, []);
  assert.deepEqual(comparison.differences.legacyBetterOn, []);
});
