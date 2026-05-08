import { NextResponse } from "next/server";

import { demoListings } from "@/lib/barter-data";
import { readInventoryListings, readMatcherListings } from "@/lib/listing-store";
import {
  compareListingChains,
  compareTradeRequestChains,
  DEFAULT_MATCH_LIMIT,
  findChainsForListingWithMode,
  findChainsForTradeRequestWithMode,
  normalizeMatchApiMaxHops,
  resolveMatchEngineMode,
} from "@/lib/match-api";
import { type MatchComparisonEngineResult } from "@/lib/match-comparison";
import { saveMatchRequestEntry } from "@/lib/match-request-store";

function toComparePayload(engine: MatchComparisonEngineResult) {
  return {
    candidateChainCount: engine.candidateChainCount,
    selectedChainCount: engine.selectedChainCount,
    averageCandidateScore: engine.averageCandidateScore,
    averageSelectedScore: engine.averageSelectedScore,
    durationMs: engine.durationMs,
    summaryMetrics: engine.summaryMetrics,
    candidateChains: engine.candidateChains.slice(0, DEFAULT_MATCH_LIMIT),
    selectedChains: engine.selectedChains.slice(0, DEFAULT_MATCH_LIMIT),
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const listingId = searchParams.get("listingId");
  const have = searchParams.get("have");
  const want = searchParams.get("want");
  const maxHops = normalizeMatchApiMaxHops(searchParams.get("maxHops"));
  const engineMode = resolveMatchEngineMode(searchParams);
  const inventoryOnly = searchParams.get("inventoryOnly") === "true";
  const listings = inventoryOnly
    ? await readInventoryListings()
    : await readMatcherListings();
  const usingStoredListings = inventoryOnly
    ? listings.length > 0
    : listings.length > demoListings.length;

  if (have && want) {
    await saveMatchRequestEntry({
      have,
      want,
      maxHops,
      engine: engineMode,
    });

    if (engineMode === "compare") {
      const comparison = compareTradeRequestChains({
        have,
        want,
        maxHops,
        listings,
      });

      return NextResponse.json({
        mode: "trade-request",
        engine: "compare",
        have,
        want,
        maxHops,
        totalListings: listings.length,
        usingStoredListings,
        inventoryOnly,
        comparison: {
          legacy: toComparePayload(comparison.legacy),
          graph: toComparePayload(comparison.graph),
          differences: comparison.differences,
        },
      });
    }

    const chains = findChainsForTradeRequestWithMode({
      mode: engineMode,
      have,
      want,
      maxHops,
      listings,
    });

    return NextResponse.json({
      mode: "trade-request",
      have,
      want,
      maxHops,
      totalListings: listings.length,
      usingStoredListings,
      inventoryOnly,
      chainCount: chains.length,
      chains,
    });
  }

  const resolvedListingId = listingId ?? listings[0]?.id;

  if (!resolvedListingId) {
    return NextResponse.json(
      {
        message: inventoryOnly
          ? "No listings are currently in the buffer."
          : "No listings are available.",
        inventoryOnly,
      },
      { status: inventoryOnly ? 404 : 500 }
    );
  }

  const listing = listings.find((entry) => entry.id === resolvedListingId);

  if (!listing) {
    return NextResponse.json(
      { message: "The requested listing was not found." },
      { status: 404 }
    );
  }

  if (engineMode === "compare") {
    const comparison = compareListingChains(resolvedListingId, maxHops, listings);

    return NextResponse.json({
      mode: "listing",
      engine: "compare",
      listing,
      maxHops,
      totalListings: listings.length,
      usingStoredListings,
      inventoryOnly,
      comparison: {
        legacy: toComparePayload(comparison.legacy),
        graph: toComparePayload(comparison.graph),
        differences: comparison.differences,
      },
    });
  }

  const chains = findChainsForListingWithMode(engineMode, resolvedListingId, maxHops, listings);

  return NextResponse.json({
    mode: "listing",
    listing,
    maxHops,
    totalListings: listings.length,
    usingStoredListings,
    inventoryOnly,
    chainCount: chains.length,
    chains,
  });
}
