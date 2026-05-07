import { type BarterListing } from "@/lib/barter-data";
import { type MatchingEngineListing } from "@/lib/matching-engine/types";

function toOptionalTrimmedValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function toFiniteNumber(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

/**
 * Maps the current UI-facing BarterListing shape to the graph engine input contract.
 *
 * Field mapping:
 * - id -> id
 * - trader -> ownerId
 * - gives -> offer
 * - wants -> wants
 * - city -> city
 * - trustScore -> trustScore
 * - estimatedValue -> estimatedValue
 *
 * Fallback behavior:
 * - blank trader falls back to listing id for ownerId
 * - blank city becomes undefined
 * - wants entries are trimmed and empty values are removed
 * - non-finite trustScore / estimatedValue values become undefined
 */
export function adaptBarterListing(listing: BarterListing): MatchingEngineListing {
  const ownerId = toOptionalTrimmedValue(listing.trader) ?? listing.id;

  return {
    id: listing.id,
    ownerId,
    offer: listing.gives.trim(),
    wants: listing.wants.map((wanted) => wanted.trim()).filter(Boolean),
    city: toOptionalTrimmedValue(listing.city),
    trustScore: toFiniteNumber(listing.trustScore),
    estimatedValue: toFiniteNumber(listing.estimatedValue),
  };
}

export function adaptBarterListings(listings: BarterListing[]): MatchingEngineListing[] {
  return listings.map(adaptBarterListing);
}
