import test from "node:test";
import assert from "node:assert/strict";

import { adaptBarterListing } from "@/lib/matching-engine/adapter";

test("adaptBarterListing maps BarterListing fields to MatchingEngineListing fields", () => {
  const adapted = adaptBarterListing({
    id: "listing-1",
    trader: "Lena",
    city: "Berlin",
    gives: "espresso machine",
    wants: ["desk lamp", "record player"],
    category: "Home",
    categorySlug: "home",
    condition: "excellent",
    estimatedValue: 140,
    shipping: "domestic",
    trustScore: 4.8,
  });

  assert.deepEqual(adapted, {
    id: "listing-1",
    ownerId: "Lena",
    offer: "espresso machine",
    wants: ["desk lamp", "record player"],
    city: "Berlin",
    trustScore: 4.8,
    estimatedValue: 140,
  });
});

test("adaptBarterListing applies documented fallbacks for blank or invalid values", () => {
  const adapted = adaptBarterListing({
    id: "listing-2",
    trader: "   ",
    city: " ",
    gives: "  guitar  ",
    wants: ["  drum  ", " ", ""],
    category: "Music",
    categorySlug: "music",
    condition: "good",
    estimatedValue: Number.NaN,
    shipping: "local-only",
    trustScore: Number.POSITIVE_INFINITY,
  });

  assert.deepEqual(adapted, {
    id: "listing-2",
    ownerId: "listing-2",
    offer: "guitar",
    wants: ["drum"],
    city: undefined,
    trustScore: undefined,
    estimatedValue: undefined,
  });
});
