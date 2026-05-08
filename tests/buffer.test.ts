import test from "node:test";
import assert from "node:assert/strict";

import {
  applyBufferTransition,
  BUFFER_DAILY_FEE_EUR,
  BUFFER_STATUS_DEPOSITED,
  BUFFER_STATUS_LISTED,
  BUFFER_STATUS_SHIPPED,
  BUFFER_STATUS_WITHDRAWN,
  calculateAccruedFeeEur,
  createInitialBufferState,
  isBufferSizeClass,
  isInBuffer,
  isValidTransition,
} from "@/lib/buffer";

test("isValidTransition allows listed → deposited and listed → withdrawn", () => {
  assert.equal(isValidTransition(BUFFER_STATUS_LISTED, BUFFER_STATUS_DEPOSITED), true);
  assert.equal(isValidTransition(BUFFER_STATUS_LISTED, BUFFER_STATUS_WITHDRAWN), true);
});

test("isValidTransition allows deposited → shipped and deposited → withdrawn", () => {
  assert.equal(isValidTransition(BUFFER_STATUS_DEPOSITED, BUFFER_STATUS_SHIPPED), true);
  assert.equal(isValidTransition(BUFFER_STATUS_DEPOSITED, BUFFER_STATUS_WITHDRAWN), true);
});

test("isValidTransition forbids transitions from terminal states", () => {
  assert.equal(isValidTransition(BUFFER_STATUS_SHIPPED, BUFFER_STATUS_DEPOSITED), false);
  assert.equal(isValidTransition(BUFFER_STATUS_WITHDRAWN, BUFFER_STATUS_DEPOSITED), false);
  assert.equal(isValidTransition(BUFFER_STATUS_SHIPPED, BUFFER_STATUS_WITHDRAWN), false);
});

test("isValidTransition forbids listed → shipped (must deposit first)", () => {
  assert.equal(isValidTransition(BUFFER_STATUS_LISTED, BUFFER_STATUS_SHIPPED), false);
});

test("isBufferSizeClass accepts S/M/L/XL and rejects others", () => {
  assert.equal(isBufferSizeClass("S"), true);
  assert.equal(isBufferSizeClass("M"), true);
  assert.equal(isBufferSizeClass("L"), true);
  assert.equal(isBufferSizeClass("XL"), true);
  assert.equal(isBufferSizeClass("XXL"), false);
  assert.equal(isBufferSizeClass(""), false);
  assert.equal(isBufferSizeClass(undefined), false);
  assert.equal(isBufferSizeClass(42), false);
});

test("isInBuffer is true only for deposited state", () => {
  assert.equal(isInBuffer(undefined), false);
  assert.equal(isInBuffer(createInitialBufferState("M")), false);

  const deposited = applyBufferTransition({
    state: createInitialBufferState("M"),
    to: BUFFER_STATUS_DEPOSITED,
  });
  assert.equal(deposited.success, true);
  if (!deposited.success) return;
  assert.equal(isInBuffer(deposited.state), true);
});

test("calculateAccruedFeeEur returns 0 when not yet deposited", () => {
  const state = createInitialBufferState("M");
  assert.equal(calculateAccruedFeeEur(state), 0);
});

test("calculateAccruedFeeEur multiplies daily rate by elapsed days", () => {
  const depositedAt = "2026-05-01T00:00:00.000Z";
  const state = {
    status: BUFFER_STATUS_DEPOSITED,
    sizeClass: "M" as const,
    depositedAt,
    releasedAt: null,
    history: [],
  };

  const asOf = new Date("2026-05-11T00:00:00.000Z");
  const fee = calculateAccruedFeeEur(state, asOf);
  assert.equal(fee, BUFFER_DAILY_FEE_EUR.M * 10);
});

test("calculateAccruedFeeEur stops accruing at releasedAt", () => {
  const state = {
    status: BUFFER_STATUS_SHIPPED,
    sizeClass: "L" as const,
    depositedAt: "2026-05-01T00:00:00.000Z",
    releasedAt: "2026-05-04T00:00:00.000Z",
    history: [],
  };

  const asOf = new Date("2026-06-01T00:00:00.000Z");
  const fee = calculateAccruedFeeEur(state, asOf);
  assert.equal(fee, BUFFER_DAILY_FEE_EUR.L * 3);
});

test("applyBufferTransition records depositedAt on first deposit and appends history", () => {
  const initial = createInitialBufferState("S", new Date("2026-05-01T08:00:00.000Z"));
  const result = applyBufferTransition({
    state: initial,
    to: BUFFER_STATUS_DEPOSITED,
    note: "in person drop-off",
    now: new Date("2026-05-02T10:00:00.000Z"),
  });

  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.state.status, BUFFER_STATUS_DEPOSITED);
  assert.equal(result.state.depositedAt, "2026-05-02T10:00:00.000Z");
  assert.equal(result.state.releasedAt, null);
  assert.equal(result.state.history.length, 2);
  assert.equal(result.state.history[1]?.status, BUFFER_STATUS_DEPOSITED);
  assert.equal(result.state.history[1]?.note, "in person drop-off");
});

test("applyBufferTransition records releasedAt on shipped", () => {
  const initial = createInitialBufferState("S");
  const deposited = applyBufferTransition({
    state: initial,
    to: BUFFER_STATUS_DEPOSITED,
    now: new Date("2026-05-02T10:00:00.000Z"),
  });
  assert.equal(deposited.success, true);
  if (!deposited.success) return;

  const shipped = applyBufferTransition({
    state: deposited.state,
    to: BUFFER_STATUS_SHIPPED,
    now: new Date("2026-05-05T12:00:00.000Z"),
  });
  assert.equal(shipped.success, true);
  if (!shipped.success) return;

  assert.equal(shipped.state.status, BUFFER_STATUS_SHIPPED);
  assert.equal(shipped.state.depositedAt, "2026-05-02T10:00:00.000Z");
  assert.equal(shipped.state.releasedAt, "2026-05-05T12:00:00.000Z");
  assert.equal(shipped.state.history.length, 3);
});

test("applyBufferTransition rejects illegal transitions and preserves state", () => {
  const initial = createInitialBufferState("M");
  const result = applyBufferTransition({
    state: initial,
    to: BUFFER_STATUS_SHIPPED,
  });

  assert.equal(result.success, false);
  if (result.success) return;
  assert.match(result.message, /Cannot transition/);
});
