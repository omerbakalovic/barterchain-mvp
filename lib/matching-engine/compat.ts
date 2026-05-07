import { type BarterListing } from "@/lib/barter-data";
import {
  normalizeBarterItem,
  toBarterChainResult,
  type BarterChain,
} from "@/lib/barter-chain-response";
import { adaptBarterListings } from "@/lib/matching-engine/adapter";
import { runMatchingEngine } from "@/lib/matching-engine/engine";

function rotateListingsToStart(listings: BarterListing[], startId: string) {
  const startIndex = listings.findIndex((listing) => listing.id === startId);

  if (startIndex <= 0) {
    return listings;
  }

  return [...listings.slice(startIndex), ...listings.slice(0, startIndex)];
}

function compareChains(left: BarterChain, right: BarterChain) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  if (left.hopCount !== right.hopCount) {
    return left.hopCount - right.hopCount;
  }

  return left.summary.localeCompare(right.summary);
}

export function enumerateGraphCompatibleChainsForListing(
  listings: BarterListing[],
  startId: string,
  maxHops = 6,
  desiredReturnItem?: string
): BarterChain[] {
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  const result = runMatchingEngine(adaptBarterListings(listings), {
    maxCycleLength: maxHops,
  });

  const chains = result.candidateCycles
    .filter(
      (cycle) => cycle.length >= 3 && cycle.length <= maxHops && cycle.listingIds.includes(startId)
    )
    .map((cycle) =>
      cycle.listingIds
        .map((id) => listingMap.get(id))
        .filter((listing): listing is BarterListing => Boolean(listing))
    )
    .filter(
      (cycleListings) =>
        cycleListings.length >= 3 &&
        cycleListings.length === new Set(cycleListings.map((listing) => listing.id)).size
    )
    .map((cycleListings) => rotateListingsToStart(cycleListings, startId))
    .map((cycleListings) => toBarterChainResult(cycleListings, desiredReturnItem));

  return chains.sort(compareChains);
}

export function findGraphCompatibleChainsForListing(
  listings: BarterListing[],
  startId: string,
  maxHops = 6,
  limit = 6,
  desiredReturnItem?: string
): BarterChain[] {
  return enumerateGraphCompatibleChainsForListing(listings, startId, maxHops, desiredReturnItem).slice(
    0,
    limit
  );
}

export function enumerateGraphCompatibleChainsForTradeRequest(input: {
  listings: BarterListing[];
  have: string;
  want: string;
  maxHops?: number;
}): BarterChain[] {
  const startingListingIds = input.listings
    .filter((listing) => normalizeBarterItem(listing.gives) === normalizeBarterItem(input.have))
    .map((listing) => listing.id);

  const deduped = new Map<string, BarterChain>();

  for (const startId of startingListingIds) {
    const chains = enumerateGraphCompatibleChainsForListing(
      input.listings,
      startId,
      input.maxHops ?? 6,
      input.want
    );

    for (const chain of chains) {
      const key = chain.listings.map((listing) => listing.id).join("|");
      const existing = deduped.get(key);

      if (!existing || compareChains(chain, existing) < 0) {
        deduped.set(key, chain);
      }
    }
  }

  return [...deduped.values()].sort(compareChains);
}

export function findGraphCompatibleChainsForTradeRequest(input: {
  listings: BarterListing[];
  have: string;
  want: string;
  maxHops?: number;
  limit?: number;
}): BarterChain[] {
  return enumerateGraphCompatibleChainsForTradeRequest(input).slice(0, input.limit ?? 6);
}
