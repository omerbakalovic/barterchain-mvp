import { demoListings, type BarterListing } from "@/lib/barter-data";
import {
  normalizeBarterItem,
  toBarterChainResult,
  type BarterChain,
} from "@/lib/barter-chain-response";

function canTrade(from: BarterListing, to: BarterListing) {
  if (from.id === to.id || from.trader === to.trader) {
    return false;
  }

  const offered = normalizeBarterItem(to.gives);
  return from.wants.some((wanted) => normalizeBarterItem(wanted) === offered);
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

function canonicalizeCycle(path: BarterListing[]) {
  return path
    .map((listing) => listing.id)
    .sort((left, right) => left.localeCompare(right))
    .join("|");
}

export function enumerateChainsForListingInListings(
  listings: BarterListing[],
  startId: string,
  maxHops = 6,
  desiredReturnItem?: string
): BarterChain[] {
  const listingMap = new Map(listings.map((listing) => [listing.id, listing]));
  const startListing = listingMap.get(startId);

  if (!startListing) {
    return [];
  }

  const start = startListing;
  const seen = new Set<string>();
  const results: BarterChain[] = [];

  function search(path: BarterListing[]) {
    const current = path[path.length - 1];

    if (!current) {
      return;
    }

    if (path.length >= 3 && canTrade(current, start)) {
      const canonical = canonicalizeCycle(path);

      if (!seen.has(canonical)) {
        seen.add(canonical);
        results.push(toBarterChainResult(path, desiredReturnItem));
      }
    }

    if (path.length === maxHops) {
      return;
    }

    for (const candidate of listings) {
      const alreadyUsedListing = path.some((listing) => listing.id === candidate.id);
      const alreadyUsedTrader = path.some((listing) => listing.trader === candidate.trader);

      if (alreadyUsedListing || alreadyUsedTrader || !canTrade(current, candidate)) {
        continue;
      }

      search([...path, candidate]);
    }
  }

  search([start]);

  return results.sort(compareChains);
}

export function findChainsForListingInListings(
  listings: BarterListing[],
  startId: string,
  maxHops = 6,
  limit = 6,
  desiredReturnItem?: string
): BarterChain[] {
  return enumerateChainsForListingInListings(listings, startId, maxHops, desiredReturnItem).slice(
    0,
    limit
  );
}

export function findChainsForListing(
  startId: string,
  maxHops = 6,
  limit = 6,
  desiredReturnItem?: string
): BarterChain[] {
  return findChainsForListingInListings(demoListings, startId, maxHops, limit, desiredReturnItem);
}

export function enumerateChainsForTradeRequestInListings(
  listings: BarterListing[],
  input: {
    have: string;
    want: string;
    maxHops?: number;
  }
) {
  const deduped = new Map<string, BarterChain>();

  const startingListings = listings.filter(
    (listing) => normalizeBarterItem(listing.gives) === normalizeBarterItem(input.have)
  );

  for (const listing of startingListings) {
    const chains = enumerateChainsForListingInListings(
      listings,
      listing.id,
      input.maxHops ?? 6,
      input.want
    );

    for (const chain of chains) {
      const key = chain.listings.map((entry) => entry.id).join("|");
      const existing = deduped.get(key);

      if (!existing || compareChains(chain, existing) < 0) {
        deduped.set(key, chain);
      }
    }
  }

  return [...deduped.values()].sort(compareChains);
}

export function findChainsForTradeRequestInListings(
  listings: BarterListing[],
  input: {
    have: string;
    want: string;
    maxHops?: number;
    limit?: number;
  }
) {
  return enumerateChainsForTradeRequestInListings(listings, input).slice(0, input.limit ?? 6);
}

export function findChainsForTradeRequest(input: {
  have: string;
  want: string;
  maxHops?: number;
  limit?: number;
}) {
  return findChainsForTradeRequestInListings(demoListings, input);
}
