import test from "node:test";
import assert from "node:assert/strict";

import { compareIds, normalizeItemName } from "@/lib/matching-engine/normalize";

test("normalizeItemName trims whitespace and lowercases", () => {
  assert.equal(normalizeItemName("  Espresso Machine  "), "espresso machine");
  assert.equal(normalizeItemName("BICIKL"), "bicikl");
  assert.equal(normalizeItemName("already-clean"), "already-clean");
});

test("normalizeItemName returns an empty string for empty or whitespace-only input", () => {
  assert.equal(normalizeItemName(""), "");
  assert.equal(normalizeItemName("   "), "");
});

test("compareIds returns a stable lexicographic ordering", () => {
  assert.ok(compareIds("a", "b") < 0);
  assert.ok(compareIds("b", "a") > 0);
  assert.equal(compareIds("same", "same"), 0);
});
