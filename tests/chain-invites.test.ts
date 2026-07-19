import test from "node:test";
import assert from "node:assert/strict";

import {
  applyChainInviteResponse,
  deriveChainInviteStatus,
  sanitizeChainInvite,
  validateChainInviteInput,
  type ChainInvite,
} from "@/lib/chain-invites";

function buildValidPayload() {
  return {
    title: "Apple-Kaskade",
    note: "Testkette",
    participants: [
      { label: "Sulz (Essen)", gives: "iPhone 17 Pro Max", wants: "iPhone 16 Pro Max", listingUrl: "https://example.com/a" },
      { label: "Amelie (Schwerin)", gives: "iPhone 17 Pro", wants: "iPhone 17 Pro Max", listingUrl: "https://example.com/b" },
      { label: "Langwedel", gives: "iPhone 16 Pro Max", wants: "iPhone 17 Pro", listingUrl: "" },
    ],
  };
}

function buildInvite(): ChainInvite {
  const validation = validateChainInviteInput(buildValidPayload());
  assert.equal(validation.success, true);
  if (!validation.success) throw new Error("unreachable");
  return validation.data;
}

test("validateChainInviteInput accepts a valid 3-participant chain", () => {
  const result = validateChainInviteInput(buildValidPayload());
  assert.equal(result.success, true);
  if (!result.success) return;

  assert.equal(result.data.participants.length, 3);
  assert.equal(result.data.participants[0]?.id, "p1");
  assert.equal(result.data.participants[0]?.status, "pending");
  assert.equal(result.data.participants[2]?.listingUrl, null);
  assert.match(result.data.id, /^[a-f0-9]{12}$/);
});

test("validateChainInviteInput rejects fewer than 3 participants and bad URLs", () => {
  const tooFew = validateChainInviteInput({
    title: "Zu klein",
    participants: [
      { label: "A", gives: "x", wants: "y" },
      { label: "B", gives: "y", wants: "x" },
    ],
  });
  assert.equal(tooFew.success, false);

  const badUrl = validateChainInviteInput({
    ...buildValidPayload(),
    participants: buildValidPayload().participants.map((p, i) =>
      i === 0 ? { ...p, listingUrl: "javascript:alert(1)" } : p
    ),
  });
  assert.equal(badUrl.success, false);
});

test("chain status derives from participant responses", () => {
  const invite = buildInvite();
  assert.equal(deriveChainInviteStatus(invite), "pending");

  const first = applyChainInviteResponse({
    invite,
    participantId: "p1",
    decision: "accepted",
    contact: "sulz@example.com",
  });
  assert.equal(first.success, true);
  if (!first.success) return;
  assert.equal(deriveChainInviteStatus(first.invite), "pending");

  const second = applyChainInviteResponse({
    invite: first.invite,
    participantId: "p2",
    decision: "accepted",
  });
  assert.equal(second.success, true);
  if (!second.success) return;

  const third = applyChainInviteResponse({
    invite: second.invite,
    participantId: "p3",
    decision: "accepted",
    contact: "langwedel@example.com",
  });
  assert.equal(third.success, true);
  if (!third.success) return;
  assert.equal(deriveChainInviteStatus(third.invite), "accepted");
});

test("a single decline kills the chain and blocks further responses", () => {
  const invite = buildInvite();
  const declined = applyChainInviteResponse({
    invite,
    participantId: "p2",
    decision: "declined",
  });
  assert.equal(declined.success, true);
  if (!declined.success) return;
  assert.equal(deriveChainInviteStatus(declined.invite), "declined");

  const late = applyChainInviteResponse({
    invite: declined.invite,
    participantId: "p1",
    decision: "accepted",
  });
  assert.equal(late.success, false);
});

test("participants cannot respond twice and unknown participants are rejected", () => {
  const invite = buildInvite();
  const first = applyChainInviteResponse({ invite, participantId: "p1", decision: "accepted" });
  assert.equal(first.success, true);
  if (!first.success) return;

  const again = applyChainInviteResponse({
    invite: first.invite,
    participantId: "p1",
    decision: "declined",
  });
  assert.equal(again.success, false);

  const unknown = applyChainInviteResponse({
    invite: first.invite,
    participantId: "p99",
    decision: "accepted",
  });
  assert.equal(unknown.success, false);
});

test("sanitizeChainInvite hides contacts until every participant accepted", () => {
  const invite = buildInvite();
  const first = applyChainInviteResponse({
    invite,
    participantId: "p1",
    decision: "accepted",
    contact: "sulz@example.com",
  });
  assert.equal(first.success, true);
  if (!first.success) return;

  const hidden = sanitizeChainInvite(first.invite);
  assert.equal(hidden.participants.every((p) => p.contact === null), true);

  const second = applyChainInviteResponse({
    invite: first.invite,
    participantId: "p2",
    decision: "accepted",
  });
  assert.equal(second.success, true);
  if (!second.success) return;
  const third = applyChainInviteResponse({
    invite: second.invite,
    participantId: "p3",
    decision: "accepted",
  });
  assert.equal(third.success, true);
  if (!third.success) return;

  const revealed = sanitizeChainInvite(third.invite);
  assert.equal(
    revealed.participants.find((p) => p.id === "p1")?.contact,
    "sulz@example.com"
  );
});
