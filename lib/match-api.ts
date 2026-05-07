import { demoListings, type BarterListing } from "@/lib/barter-data";
import {
  findChainsForListingInListings as findLegacyChainsForListingInListings,
  findChainsForTradeRequestInListings as findLegacyChainsForTradeRequestInListings,
} from "@/lib/barter-match";
import {
  compareListingMatchEngines,
  compareTradeRequestMatchEngines,
  type MatchComparisonResult,
} from "@/lib/match-comparison";
import {
  findGraphCompatibleChainsForListing,
  findGraphCompatibleChainsForTradeRequest,
} from "@/lib/matching-engine/compat";

export const DEFAULT_MATCH_LIMIT = 6;
export const DEFAULT_MATCH_MAX_HOPS = 6;
export const MIN_MATCH_HOPS = 3;
export const MAX_MATCH_HOPS = 6;

export type MatchEngineMode = "legacy" | "graph";
export type MatchApiMode = MatchEngineMode | "compare";

export function normalizeMatchApiMaxHops(value: string | null) {
  const parsed = Number(value ?? `${DEFAULT_MATCH_MAX_HOPS}`);
  return Number.isFinite(parsed)
    ? Math.min(Math.max(Math.floor(parsed), MIN_MATCH_HOPS), MAX_MATCH_HOPS)
    : DEFAULT_MATCH_MAX_HOPS;
}

export function resolveMatchEngineMode(
  searchParams: URLSearchParams,
  env: NodeJS.ProcessEnv = process.env
): MatchApiMode {
  const requestedMode = searchParams.get("engine")?.trim().toLowerCase();

  if (requestedMode === "graph" || requestedMode === "legacy" || requestedMode === "compare") {
    return requestedMode;
  }

  const configuredMode = env.MATCH_API_ENGINE?.trim().toLowerCase();
  return configuredMode === "graph" ? "graph" : "legacy";
}

function getListings(listings?: BarterListing[]) {
  return listings ?? demoListings;
}

export function findChainsForListingWithMode(
  mode: MatchEngineMode,
  listingId: string,
  maxHops: number,
  listings?: BarterListing[]
) {
  const resolvedListings = getListings(listings);

  if (mode === "graph") {
    return findGraphCompatibleChainsForListing(
      resolvedListings,
      listingId,
      maxHops,
      DEFAULT_MATCH_LIMIT
    );
  }

  return findLegacyChainsForListingInListings(
    resolvedListings,
    listingId,
    maxHops,
    DEFAULT_MATCH_LIMIT
  );
}

export function findChainsForTradeRequestWithMode(input: {
  mode: MatchEngineMode;
  have: string;
  want: string;
  maxHops: number;
  listings?: BarterListing[];
}) {
  const resolvedListings = getListings(input.listings);

  if (input.mode === "graph") {
    return findGraphCompatibleChainsForTradeRequest({
      listings: resolvedListings,
      have: input.have,
      want: input.want,
      maxHops: input.maxHops,
      limit: DEFAULT_MATCH_LIMIT,
    });
  }

  return findLegacyChainsForTradeRequestInListings(resolvedListings, {
    have: input.have,
    want: input.want,
    maxHops: input.maxHops,
    limit: DEFAULT_MATCH_LIMIT,
  });
}

export function compareListingChains(
  listingId: string,
  maxHops: number,
  listings?: BarterListing[]
): MatchComparisonResult {
  return compareListingMatchEngines({
    listings: getListings(listings),
    listingId,
    maxHops,
  });
}

export function compareTradeRequestChains(input: {
  have: string;
  want: string;
  maxHops: number;
  listings?: BarterListing[];
}): MatchComparisonResult {
  return compareTradeRequestMatchEngines({
    listings: getListings(input.listings),
    have: input.have,
    want: input.want,
    maxHops: input.maxHops,
  });
}
