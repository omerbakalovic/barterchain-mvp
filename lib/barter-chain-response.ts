import { type BarterListing } from "@/lib/barter-data";
import { buildChainId } from "@/lib/chain-proposals";

export type BarterChain = {
  chainId: string;
  listings: BarterListing[];
  hopCount: number;
  score: number;
  summary: string;
  returnItem: string;
  reasons: string[];
};

function getListingLabel(listing: BarterListing) {
  return listing.title ?? listing.trader;
}

export function normalizeBarterItem(value: string) {
  return value.trim().toLowerCase();
}

export function buildBarterChainSummary(chain: BarterListing[]) {
  return chain
    .map((listing, index) => {
      const next = chain[(index + 1) % chain.length];
      return `${getListingLabel(listing)} gives ${listing.gives} to ${getListingLabel(next)}`;
    })
    .join(" -> ");
}

export function scoreBarterChain(chain: BarterListing[], desiredReturnItem?: string) {
  const start = chain[0];
  const last = chain[chain.length - 1];
  const returnItem = last.gives;
  const normalizedDesiredItem = desiredReturnItem
    ? normalizeBarterItem(desiredReturnItem)
    : null;

  let score = 0;
  const reasons: string[] = [];

  if (normalizedDesiredItem && normalizeBarterItem(returnItem) === normalizedDesiredItem) {
    score += 60;
    reasons.push("exact return item match");
  }

  const sameCityCount = chain.slice(1).filter((listing) => listing.city === start.city).length;
  if (sameCityCount > 0) {
    score += sameCityCount * 8;
    reasons.push(`${sameCityCount} trader(s) in the same city as the starter`);
  }

  const averageTrustScore =
    chain.reduce((total, listing) => total + listing.trustScore, 0) / chain.length;
  score += averageTrustScore * 5;
  reasons.push(`average trust score ${averageTrustScore.toFixed(1)}`);

  const valueSpread =
    Math.max(...chain.map((listing) => listing.estimatedValue)) -
    Math.min(...chain.map((listing) => listing.estimatedValue));
  const valueBonus = Math.max(0, 18 - valueSpread / 10);
  score += valueBonus;
  reasons.push(`value spread ${valueSpread} EUR`);

  const shorterChainBonus = Math.max(0, 30 - chain.length * 6);
  score += shorterChainBonus;
  reasons.push(`${chain.length}-hop chain`);

  return {
    score: Number(score.toFixed(2)),
    returnItem,
    reasons,
  };
}

export function toBarterChainResult(
  chain: BarterListing[],
  desiredReturnItem?: string
): BarterChain {
  const ranking = scoreBarterChain(chain, desiredReturnItem);

  return {
    chainId: buildChainId(chain),
    listings: [...chain],
    hopCount: chain.length,
    summary: buildBarterChainSummary(chain),
    score: ranking.score,
    returnItem: ranking.returnItem,
    reasons: ranking.reasons,
  };
}



