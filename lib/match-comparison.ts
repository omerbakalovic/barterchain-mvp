import { performance } from "node:perf_hooks";

import { buildBarterChainSummary, type BarterChain } from "@/lib/barter-chain-response";
import { buildChainId } from "@/lib/chain-proposals";
import { type BarterListing } from "@/lib/barter-data";
import {
  enumerateChainsForListingInListings,
  enumerateChainsForTradeRequestInListings,
} from "@/lib/barter-match";
import { adaptBarterListings } from "@/lib/matching-engine/adapter";
import {
  enumerateGraphCompatibleChainsForListing,
  enumerateGraphCompatibleChainsForTradeRequest,
} from "@/lib/matching-engine/compat";
import { runMatchingEngine } from "@/lib/matching-engine/engine";
import { selectBestNonOverlappingCycles } from "@/lib/matching-engine/selection";
import { type ScoredCycle } from "@/lib/matching-engine/types";

export type ComparableEngineMode = "legacy" | "graph";

export type MatchSummaryMetrics = {
  totalListings: number;
  selectedListingCount: number;
  coverage: number;
  disjointChainCount: number;
  averageChainQuality: number;
  trustAverage: number;
  valueFairness: number;
};

export type MatchMetricComparison = {
  legacy: number;
  graph: number;
  delta: number;
  winner: ComparableEngineMode | "tie";
};

export type MatchComparisonEngineResult = {
  engine: ComparableEngineMode;
  candidateChainCount: number;
  selectedChainCount: number;
  averageCandidateScore: number;
  averageSelectedScore: number;
  durationMs: number;
  candidateChains: BarterChain[];
  selectedChains: BarterChain[];
  summaryMetrics: MatchSummaryMetrics;
};

export type MatchComparisonDifference = {
  candidateOnlyInLegacy: string[];
  candidateOnlyInGraph: string[];
  selectedOnlyInLegacy: string[];
  selectedOnlyInGraph: string[];
  scoreMismatches: Array<{
    chain: string;
    legacyScore: number;
    graphScore: number;
    delta: number;
  }>;
  topCandidateChange?: {
    legacy: string;
    graph: string;
  };
  topSelectedChange?: {
    legacy: string;
    graph: string;
  };
  summaryMetricComparisons: {
    coverage: MatchMetricComparison;
    disjointChainCount: MatchMetricComparison;
    averageChainQuality: MatchMetricComparison;
    trustAverage: MatchMetricComparison;
    valueFairness: MatchMetricComparison;
  };
  graphBetterOn: string[];
  legacyBetterOn: string[];
};

export type MatchComparisonResult = {
  legacy: MatchComparisonEngineResult;
  graph: MatchComparisonEngineResult;
  differences: MatchComparisonDifference;
};

export type MarketplaceComparisonResult = MatchComparisonResult;

function compareChains(left: BarterChain, right: BarterChain) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (left.hopCount !== right.hopCount) {
    return left.hopCount - right.hopCount;
  }

  return left.summary.localeCompare(right.summary);
}

function getChainKey(chain: BarterChain) {
  return chain.listings.map((listing) => listing.id).join("|");
}

function getCanonicalChainKey(listings: Array<{ id: string }>) {
  return listings
    .map((listing) => listing.id)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

function roundMetric(value: number) {
  return Number(value.toFixed(2));
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageScore(chains: BarterChain[]) {
  return roundMetric(average(chains.map((chain) => chain.score)));
}

function selectNonOverlappingChains(chains: BarterChain[]) {
  const cycleByKey = new Map(chains.map((chain) => [getChainKey(chain), chain]));
  const selected = selectBestNonOverlappingCycles(
    chains.map<ScoredCycle>((chain) => ({
      listingIds: chain.listings.map((listing) => listing.id),
      listings: [],
      score: chain.score,
      reasons: chain.reasons,
      length: chain.hopCount,
    }))
  );

  return selected
    .map((cycle) => cycleByKey.get(cycle.listingIds.join("|")))
    .filter((chain): chain is BarterChain => Boolean(chain))
    .sort(compareChains);
}

function getChainTrustAverage(chain: BarterChain) {
  return average(chain.listings.map((listing) => listing.trustScore));
}

function getChainValueFairness(chain: BarterChain) {
  const values = chain.listings.map((listing) => listing.estimatedValue);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  if (maxValue <= 0) {
    return 1;
  }

  return minValue / maxValue;
}

function getChainCityCoherence(chain: BarterChain) {
  const counts = new Map<string, number>();

  for (const listing of chain.listings) {
    counts.set(listing.city, (counts.get(listing.city) ?? 0) + 1);
  }

  const maxCount = Math.max(...counts.values());
  return maxCount / chain.listings.length;
}

function getChainEfficiency(chain: BarterChain) {
  return Math.max(0, 1 - Math.max(0, chain.hopCount - 3) / 5);
}

function getChainQuality(chain: BarterChain) {
  const trustComponent = getChainTrustAverage(chain) / 5;
  const fairnessComponent = getChainValueFairness(chain);
  const cityComponent = getChainCityCoherence(chain);
  const efficiencyComponent = getChainEfficiency(chain);

  return roundMetric(
    (trustComponent * 0.35 + fairnessComponent * 0.25 + cityComponent * 0.2 + efficiencyComponent * 0.2) *
      100
  );
}

function buildSummaryMetrics(chains: BarterChain[], totalListings: number): MatchSummaryMetrics {
  const selectedListingIds = new Set(chains.flatMap((chain) => chain.listings.map((listing) => listing.id)));
  const selectedListings = chains.flatMap((chain) => chain.listings);

  return {
    totalListings,
    selectedListingCount: selectedListingIds.size,
    coverage: totalListings === 0 ? 0 : roundMetric((selectedListingIds.size / totalListings) * 100),
    disjointChainCount: chains.length,
    averageChainQuality: roundMetric(average(chains.map(getChainQuality))),
    trustAverage: roundMetric(average(selectedListings.map((listing) => listing.trustScore))),
    valueFairness: roundMetric(average(chains.map((chain) => getChainValueFairness(chain) * 100))),
  };
}

function compareMetric(legacyValue: number, graphValue: number): MatchMetricComparison {
  const delta = roundMetric(graphValue - legacyValue);

  return {
    legacy: legacyValue,
    graph: graphValue,
    delta,
    winner: delta === 0 ? "tie" : delta > 0 ? "graph" : "legacy",
  };
}

function buildSummaryMetricComparisons(
  legacy: MatchSummaryMetrics,
  graph: MatchSummaryMetrics
) {
  return {
    coverage: compareMetric(legacy.coverage, graph.coverage),
    disjointChainCount: compareMetric(legacy.disjointChainCount, graph.disjointChainCount),
    averageChainQuality: compareMetric(legacy.averageChainQuality, graph.averageChainQuality),
    trustAverage: compareMetric(legacy.trustAverage, graph.trustAverage),
    valueFairness: compareMetric(legacy.valueFairness, graph.valueFairness),
  };
}

function buildDifferenceSummary(
  legacy: MatchComparisonEngineResult,
  graph: MatchComparisonEngineResult
): MatchComparisonDifference {
  const legacyCandidates = new Map(legacy.candidateChains.map((chain) => [getChainKey(chain), chain]));
  const graphCandidates = new Map(graph.candidateChains.map((chain) => [getChainKey(chain), chain]));
  const legacySelected = new Set(legacy.selectedChains.map(getChainKey));
  const graphSelected = new Set(graph.selectedChains.map(getChainKey));
  const summaryMetricComparisons = buildSummaryMetricComparisons(
    legacy.summaryMetrics,
    graph.summaryMetrics
  );

  return {
    candidateOnlyInLegacy: [...legacyCandidates.keys()].filter((key) => !graphCandidates.has(key)),
    candidateOnlyInGraph: [...graphCandidates.keys()].filter((key) => !legacyCandidates.has(key)),
    selectedOnlyInLegacy: [...legacySelected].filter((key) => !graphSelected.has(key)),
    selectedOnlyInGraph: [...graphSelected].filter((key) => !legacySelected.has(key)),
    scoreMismatches: [...legacyCandidates.entries()]
      .filter(([key]) => graphCandidates.has(key))
      .map(([key, legacyChain]) => {
        const graphChain = graphCandidates.get(key)!;
        return {
          chain: key,
          legacyScore: legacyChain.score,
          graphScore: graphChain.score,
          delta: roundMetric(graphChain.score - legacyChain.score),
        };
      })
      .filter((entry) => entry.delta !== 0)
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
      .slice(0, 5),
    topCandidateChange:
      legacy.candidateChains[0] &&
      graph.candidateChains[0] &&
      getChainKey(legacy.candidateChains[0]) !== getChainKey(graph.candidateChains[0])
        ? {
            legacy: getChainKey(legacy.candidateChains[0]),
            graph: getChainKey(graph.candidateChains[0]),
          }
        : undefined,
    topSelectedChange:
      legacy.selectedChains[0] &&
      graph.selectedChains[0] &&
      getChainKey(legacy.selectedChains[0]) !== getChainKey(graph.selectedChains[0])
        ? {
            legacy: getChainKey(legacy.selectedChains[0]),
            graph: getChainKey(graph.selectedChains[0]),
          }
        : undefined,
    summaryMetricComparisons,
    graphBetterOn: Object.entries(summaryMetricComparisons)
      .filter(([, entry]) => entry.winner === "graph")
      .map(([metric]) => metric),
    legacyBetterOn: Object.entries(summaryMetricComparisons)
      .filter(([, entry]) => entry.winner === "legacy")
      .map(([metric]) => metric),
  };
}

function evaluateEngine(
  engine: ComparableEngineMode,
  getCandidateChains: () => BarterChain[],
  totalListings: number
): MatchComparisonEngineResult {
  const startedAt = performance.now();
  const candidateChains = getCandidateChains();
  const selectedChains = selectNonOverlappingChains(candidateChains);

  return {
    engine,
    candidateChainCount: candidateChains.length,
    selectedChainCount: selectedChains.length,
    averageCandidateScore: averageScore(candidateChains),
    averageSelectedScore: averageScore(selectedChains),
    durationMs: roundMetric(performance.now() - startedAt),
    candidateChains,
    selectedChains,
    summaryMetrics: buildSummaryMetrics(selectedChains, totalListings),
  };
}

export function compareListingMatchEngines(input: {
  listings: BarterListing[];
  listingId: string;
  maxHops: number;
}): MatchComparisonResult {
  const legacy = evaluateEngine(
    "legacy",
    () => enumerateChainsForListingInListings(input.listings, input.listingId, input.maxHops),
    input.listings.length
  );
  const graph = evaluateEngine(
    "graph",
    () => enumerateGraphCompatibleChainsForListing(input.listings, input.listingId, input.maxHops),
    input.listings.length
  );

  return {
    legacy,
    graph,
    differences: buildDifferenceSummary(legacy, graph),
  };
}

export function compareTradeRequestMatchEngines(input: {
  listings: BarterListing[];
  have: string;
  want: string;
  maxHops: number;
}): MatchComparisonResult {
  const legacy = evaluateEngine(
    "legacy",
    () =>
      enumerateChainsForTradeRequestInListings(input.listings, {
        have: input.have,
        want: input.want,
        maxHops: input.maxHops,
      }),
    input.listings.length
  );
  const graph = evaluateEngine(
    "graph",
    () =>
      enumerateGraphCompatibleChainsForTradeRequest({
        listings: input.listings,
        have: input.have,
        want: input.want,
        maxHops: input.maxHops,
      }),
    input.listings.length
  );

  return {
    legacy,
    graph,
    differences: buildDifferenceSummary(legacy, graph),
  };
}

function projectScoredCycleToChain(cycle: ScoredCycle, listingMap: Map<string, BarterListing>): BarterChain {
  const listings = cycle.listingIds
    .map((id) => listingMap.get(id))
    .filter((listing): listing is BarterListing => Boolean(listing));

  return {
    chainId: buildChainId(listings),
    listings,
    hopCount: listings.length,
    score: cycle.score,
    summary: buildBarterChainSummary(listings),
    returnItem: listings[listings.length - 1]?.gives ?? "",
    reasons: cycle.reasons,
  };
}

function enumerateLegacyMarketplaceChains(listings: BarterListing[], maxHops: number) {
  const deduped = new Map<string, BarterChain>();

  for (const listing of listings) {
    const chains = enumerateChainsForListingInListings(listings, listing.id, maxHops);

    for (const chain of chains) {
      const key = getCanonicalChainKey(chain.listings);
      const existing = deduped.get(key);

      if (!existing || compareChains(chain, existing) < 0) {
        deduped.set(key, chain);
      }
    }
  }

  return [...deduped.values()].sort(compareChains);
}

export function compareMarketplaceMatchEngines(input: {
  listings: BarterListing[];
  maxHops: number;
}): MarketplaceComparisonResult {
  const listingMap = new Map(input.listings.map((listing) => [listing.id, listing]));
  const legacy = evaluateEngine(
    "legacy",
    () => enumerateLegacyMarketplaceChains(input.listings, input.maxHops),
    input.listings.length
  );

  const graphStartedAt = performance.now();
  const graphCandidateChains: BarterChain[] = [];
  const graphSelectedChains: BarterChain[] = [];
  const graphResult = runMatchingEngine(adaptBarterListings(input.listings), {
    maxCycleLength: input.maxHops,
  });

  for (const cycle of graphResult.candidateCycles) {
    graphCandidateChains.push(projectScoredCycleToChain(cycle, listingMap));
  }

  for (const cycle of graphResult.selectedCycles) {
    graphSelectedChains.push(projectScoredCycleToChain(cycle, listingMap));
  }

  const graph: MatchComparisonEngineResult = {
    engine: "graph",
    candidateChainCount: graphCandidateChains.length,
    selectedChainCount: graphSelectedChains.length,
    averageCandidateScore: averageScore(graphCandidateChains),
    averageSelectedScore: averageScore(graphSelectedChains),
    durationMs: roundMetric(performance.now() - graphStartedAt),
    candidateChains: graphCandidateChains,
    selectedChains: graphSelectedChains,
    summaryMetrics: buildSummaryMetrics(graphSelectedChains, input.listings.length),
  };

  const differences = buildDifferenceSummary(legacy, graph);
  const legacyCandidatesByKey = new Map(
    legacy.candidateChains.map((chain) => [getCanonicalChainKey(chain.listings), chain])
  );
  const graphCandidatesByKey = new Map(
    graph.candidateChains.map((chain) => [getCanonicalChainKey(chain.listings), chain])
  );
  const legacySelected = new Set(legacy.selectedChains.map((chain) => getCanonicalChainKey(chain.listings)));
  const graphSelected = new Set(graph.selectedChains.map((chain) => getCanonicalChainKey(chain.listings)));

  return {
    legacy,
    graph,
    differences: {
      ...differences,
      candidateOnlyInLegacy: [...legacyCandidatesByKey.keys()].filter((key) => !graphCandidatesByKey.has(key)),
      candidateOnlyInGraph: [...graphCandidatesByKey.keys()].filter((key) => !legacyCandidatesByKey.has(key)),
      selectedOnlyInLegacy: [...legacySelected].filter((key) => !graphSelected.has(key)),
      selectedOnlyInGraph: [...graphSelected].filter((key) => !legacySelected.has(key)),
      scoreMismatches: [...legacyCandidatesByKey.entries()]
        .filter(([key]) => graphCandidatesByKey.has(key))
        .map(([key, legacyChain]) => {
          const graphChain = graphCandidatesByKey.get(key)!;
          return {
            chain: key,
            legacyScore: legacyChain.score,
            graphScore: graphChain.score,
            delta: roundMetric(graphChain.score - legacyChain.score),
          };
        })
        .filter((entry) => entry.delta !== 0)
        .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta))
        .slice(0, 5),
    },
  };
}

