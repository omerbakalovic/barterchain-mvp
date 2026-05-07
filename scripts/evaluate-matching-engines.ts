import { matchingEvaluationFixtures } from "@/lib/matching-evaluation-fixtures";
import {
  compareListingMatchEngines,
  compareMarketplaceMatchEngines,
  compareTradeRequestMatchEngines,
  type MatchComparisonResult,
} from "@/lib/match-comparison";

function summarizeChain(chain: MatchComparisonResult["legacy"]["selectedChains"][number]) {
  return {
    key: chain.listings.map((listing) => listing.id).join("|"),
    score: chain.score,
    hopCount: chain.hopCount,
    trustAverage:
      chain.listings.reduce((sum, listing) => sum + listing.trustScore, 0) / chain.listings.length,
    valueSpread:
      Math.max(...chain.listings.map((listing) => listing.estimatedValue)) -
      Math.min(...chain.listings.map((listing) => listing.estimatedValue)),
    cities: [...new Set(chain.listings.map((listing) => listing.city))],
    reasons: chain.reasons.slice(0, 3),
  };
}

function summarizeEngine(engine: MatchComparisonResult["legacy"]) {
  return {
    candidateChainCount: engine.candidateChainCount,
    selectedChainCount: engine.selectedChainCount,
    averageCandidateScore: engine.averageCandidateScore,
    averageSelectedScore: engine.averageSelectedScore,
    durationMs: engine.durationMs,
    summaryMetrics: engine.summaryMetrics,
    topSelectedChains: engine.selectedChains.slice(0, 3).map(summarizeChain),
  };
}

function summarizeDifferences(result: MatchComparisonResult) {
  return {
    candidateOnlyInLegacy: result.differences.candidateOnlyInLegacy,
    candidateOnlyInGraph: result.differences.candidateOnlyInGraph,
    selectedOnlyInLegacy: result.differences.selectedOnlyInLegacy,
    selectedOnlyInGraph: result.differences.selectedOnlyInGraph,
    scoreMismatches: result.differences.scoreMismatches,
    topCandidateChange: result.differences.topCandidateChange,
    topSelectedChange: result.differences.topSelectedChange,
    summaryMetricComparisons: result.differences.summaryMetricComparisons,
    graphBetterOn: result.differences.graphBetterOn,
    legacyBetterOn: result.differences.legacyBetterOn,
  };
}

function summarizeVerdict(result: MatchComparisonResult) {
  const graphWins = result.differences.graphBetterOn.length;
  const legacyWins = result.differences.legacyBetterOn.length;

  if (graphWins > legacyWins) {
    return "graph-advantage";
  }

  if (legacyWins > graphWins) {
    return "legacy-advantage";
  }

  return "mixed-or-tied";
}

const fixtureReports = matchingEvaluationFixtures.map((fixture) => {
  const marketplace = fixture.market
    ? compareMarketplaceMatchEngines({
        listings: fixture.listings,
        maxHops: fixture.market.maxHops,
      })
    : null;

  return {
    fixture: fixture.name,
    description: fixture.description,
    testing: fixture.testing ?? [],
    listings: fixture.listings.length,
    marketplace: marketplace
      ? {
          description: fixture.market?.description,
          expectations: fixture.market?.expectations ?? [],
          maxHops: fixture.market?.maxHops,
          verdict: summarizeVerdict(marketplace),
          legacy: summarizeEngine(marketplace.legacy),
          graph: summarizeEngine(marketplace.graph),
          differences: summarizeDifferences(marketplace),
        }
      : undefined,
    scenarios: fixture.scenarios.map((scenario) => {
      const comparison =
        scenario.kind === "listing"
          ? compareListingMatchEngines({
              listings: fixture.listings,
              listingId: scenario.listingId,
              maxHops: scenario.maxHops,
            })
          : compareTradeRequestMatchEngines({
              listings: fixture.listings,
              have: scenario.have,
              want: scenario.want,
              maxHops: scenario.maxHops,
            });

      return {
        name: scenario.name,
        description: scenario.description,
        kind: scenario.kind,
        maxHops: scenario.maxHops,
        request:
          scenario.kind === "listing"
            ? { listingId: scenario.listingId }
            : { have: scenario.have, want: scenario.want },
        verdict: summarizeVerdict(comparison),
        legacy: summarizeEngine(comparison.legacy),
        graph: summarizeEngine(comparison.graph),
        differences: summarizeDifferences(comparison),
      };
    }),
  };
});

type MarketplaceReport = NonNullable<(typeof fixtureReports)[number]["marketplace"]>;
const marketComparisons = fixtureReports
  .map((fixture) => fixture.marketplace)
  .filter((market): market is MarketplaceReport => Boolean(market));

const metricNames = [
  "coverage",
  "disjointChainCount",
  "averageChainQuality",
  "trustAverage",
  "valueFairness",
] as const;

const metricTally = Object.fromEntries(
  metricNames.map((metric) => [
    metric,
    marketComparisons.reduce(
      (accumulator, market) => {
        const winner = market.differences.summaryMetricComparisons[metric].winner;
        accumulator[winner] += 1;
        return accumulator;
      },
      { legacy: 0, graph: 0, tie: 0 }
    ),
  ])
);

const strongGraphFixtures = fixtureReports
  .filter((fixture) => fixture.marketplace?.verdict === "graph-advantage")
  .map((fixture) => fixture.fixture);
const strongLegacyFixtures = fixtureReports
  .filter((fixture) => fixture.marketplace?.verdict === "legacy-advantage")
  .map((fixture) => fixture.fixture);
const mixedFixtures = fixtureReports
  .filter((fixture) => fixture.marketplace?.verdict === "mixed-or-tied")
  .map((fixture) => fixture.fixture);

const overallSummary = {
  fixtureCount: fixtureReports.length,
  marketplaceComparisons: marketComparisons.length,
  metricTally,
  graphAdvantageFixtures: strongGraphFixtures,
  legacyAdvantageFixtures: strongLegacyFixtures,
  mixedOrTiedFixtures: mixedFixtures,
  switchRecommendation: {
    readyToSwitchDefault:
      marketComparisons.length > 0 &&
      metricTally.coverage.graph >= Math.ceil(marketComparisons.length / 3) &&
      metricTally.averageChainQuality.legacy === 0 &&
      strongLegacyFixtures.length === 0,
    conditions: [
      "Graph should beat or tie legacy on coverage in every control fixture and win coverage on most hard marketplace fixtures.",
      "Graph should not lose average chain quality on any high-priority marketplace fixture, especially the regional tradeoff and sparse dead-end controls.",
      "Graph should beat legacy on at least one of trust average or value fairness in the hard overlapping and synthetic fixtures.",
      "Request-scoped compare scenarios should remain parity or fully explained before changing MATCH_API_ENGINE.",
      "Keep legacy mode and compare mode available after the default flip as rollback and diagnostics paths."
    ]
  }
};

console.log(
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      overallSummary,
      fixtures: fixtureReports,
    },
    null,
    2
  )
);
