import { type MatchingGraph, type MatchingEngineListing, type ScoredCycle } from "@/lib/matching-engine/types";

function buildSummaryReasons(listings: MatchingEngineListing[]) {
  const reasons: string[] = [];
  const starter = listings[0];

  const sameCityCount = listings.slice(1).filter((listing) => listing.city && listing.city === starter.city).length;
  if (sameCityCount > 0) {
    reasons.push(`${sameCityCount} node(s) share starter city`);
  }

  const trustScores = listings.map((listing) => listing.trustScore ?? 0);
  const averageTrust = trustScores.reduce((sum, value) => sum + value, 0) / listings.length;
  reasons.push(`average trust ${averageTrust.toFixed(2)}`);

  const values = listings.map((listing) => listing.estimatedValue ?? 0);
  const spread = Math.max(...values) - Math.min(...values);
  reasons.push(`value spread ${spread}`);
  reasons.push(`${listings.length}-cycle`);

  return { sameCityCount, averageTrust, spread, reasons };
}

export function scoreCycles(graph: MatchingGraph, cycles: string[][]): ScoredCycle[] {
  return cycles.map((cycle) => {
    const listings = cycle
      .map((id) => graph.nodes.get(id)?.listing)
      .filter((listing): listing is MatchingEngineListing => Boolean(listing));

    const { sameCityCount, averageTrust, spread, reasons } = buildSummaryReasons(listings);
    const shorterCycleBonus = Math.max(0, 32 - listings.length * 4);
    const cityBonus = sameCityCount * 6;
    const trustBonus = averageTrust * 5;
    const valueBonus = Math.max(0, 20 - spread / 10);
    const score = Number((shorterCycleBonus + cityBonus + trustBonus + valueBonus).toFixed(2));

    return {
      listingIds: [...cycle],
      listings,
      score,
      reasons,
      length: listings.length,
    };
  }).sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }

    if (left.length !== right.length) {
      return left.length - right.length;
    }

    return left.listingIds.join("|").localeCompare(right.listingIds.join("|"));
  });
}
