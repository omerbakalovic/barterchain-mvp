import { type BarterListing } from "@/lib/barter-data";

export const MIN_TRUST_SCORE = 1;
export const MAX_TRUST_SCORE = 5;

export type ListingInput = {
  title: string;
  description: string;
  category: string;
  valueEstimate: number;
  city: string;
  trustScore: number;
  gives: string;
  wants: string[];
};

export type StoredListing = ListingInput & {
  id: string;
  createdAt: string;
  source: "supabase" | "local";
};

export type ListingValidationResult =
  | {
      success: true;
      data: ListingInput;
    }
  | {
      success: false;
      errors: string[];
    };

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function slugify(value: string) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function parseWantedItems(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeWhitespace(item)).filter(Boolean);
  }

  return (value ?? "")
    .split(/[\n,]/)
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean);
}

export function validateListingInput(payload: Record<string, unknown>): ListingValidationResult {
  const title = normalizeWhitespace(`${payload.title ?? ""}`);
  const description = `${payload.description ?? ""}`.trim();
  const category = normalizeWhitespace(`${payload.category ?? ""}`);
  const city = normalizeWhitespace(`${payload.city ?? ""}`);
  const gives = normalizeWhitespace(`${payload.gives ?? payload.have ?? ""}`);
  const wants = parseWantedItems(payload.wants as string | string[] | undefined);
  const valueEstimate = Number(payload.valueEstimate);
  const trustScore = Number(payload.trustScore);
  const errors: string[] = [];

  if (title.length < 3) {
    errors.push("Title must be at least 3 characters.");
  }

  if (description.length < 10) {
    errors.push("Description must be at least 10 characters.");
  }

  if (category.length < 2) {
    errors.push("Item category is required.");
  }

  if (!Number.isFinite(valueEstimate) || valueEstimate <= 0) {
    errors.push("Value estimate must be a positive number.");
  }

  if (city.length < 2) {
    errors.push("City is required.");
  }

  if (!Number.isFinite(trustScore) || trustScore < MIN_TRUST_SCORE || trustScore > MAX_TRUST_SCORE) {
    errors.push(`Trust rating must be between ${MIN_TRUST_SCORE} and ${MAX_TRUST_SCORE}.`);
  }

  if (gives.length < 2) {
    errors.push("I have must describe the offered item.");
  }

  if (wants.length === 0) {
    errors.push("Add at least one wanted item.");
  }

  if (wants.some((item) => item.toLowerCase() === gives.toLowerCase())) {
    errors.push("Wanted items must be different from the offered item.");
  }

  if (errors.length > 0) {
    return {
      success: false,
      errors,
    };
  }

  return {
    success: true,
    data: {
      title,
      description,
      category,
      valueEstimate: Number(valueEstimate.toFixed(2)),
      city,
      trustScore: Number(trustScore.toFixed(1)),
      gives,
      wants,
    },
  };
}

export function createListingId(input: ListingInput) {
  const prefix = slugify(input.title || input.gives || "listing") || "listing";
  const suffix = Date.now().toString(36);
  return `${prefix}-${suffix}`;
}

export function toBarterListing(listing: StoredListing): BarterListing {
  return {
    id: listing.id,
    trader: listing.title,
    title: listing.title,
    description: listing.description,
    city: listing.city,
    gives: listing.gives,
    wants: listing.wants,
    category: listing.category,
    categorySlug: slugify(listing.category) || "general",
    condition: "good",
    estimatedValue: listing.valueEstimate,
    shipping: "local-only",
    trustScore: listing.trustScore,
    source: listing.source,
  };
}
