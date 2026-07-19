import test from "node:test";
import assert from "node:assert/strict";

import {
  applyChainInviteResponse,
  validateChainInviteInput,
  type ChainInvite,
} from "@/lib/chain-invites";
import {
  buildChainInviteNotification,
  isLikelyEmail,
  sendChainInviteNotifications,
} from "@/lib/chain-notifications";

function buildInvite(): ChainInvite {
  const validation = validateChainInviteInput({
    title: "Apple-Kaskade",
    participants: [
      { label: "Sulz (Essen)", gives: "17 Pro Max", wants: "16 Pro Max" },
      { label: "Amelie (Schwerin)", gives: "17 Pro", wants: "17 Pro Max" },
      { label: "Langwedel", gives: "16 Pro Max", wants: "17 Pro" },
    ],
  });
  assert.equal(validation.success, true);
  if (!validation.success) throw new Error("unreachable");
  return validation.data;
}

function accept(invite: ChainInvite, participantId: string, contact?: string): ChainInvite {
  const result = applyChainInviteResponse({
    invite,
    participantId,
    decision: "accepted",
    contact,
  });
  assert.equal(result.success, true);
  if (!result.success) throw new Error("unreachable");
  return result.invite;
}

test("isLikelyEmail separates emails from phone numbers and junk", () => {
  assert.equal(isLikelyEmail("mara@example.com"), true);
  assert.equal(isLikelyEmail("  mara@example.com  "), true);
  assert.equal(isLikelyEmail("0176 1234567"), false);
  assert.equal(isLikelyEmail("Telegram: @mara"), false);
  assert.equal(isLikelyEmail(""), false);
  assert.equal(isLikelyEmail(null), false);
});

test("first acceptance notifies only the operator", () => {
  const invite = accept(buildInvite(), "p1", "sulz@example.com");

  const notification = buildChainInviteNotification({
    invite,
    respondedParticipantId: "p1",
    decision: "accepted",
    baseUrl: "https://example.com",
    operatorEmail: "omer@example.com",
  });

  assert.ok(notification);
  assert.deepEqual(notification?.recipients, ["omer@example.com"]);
  assert.match(notification?.subject ?? "", /ist dabei \(1\/3\)/);
  assert.match(notification?.text ?? "", /Sulz \(Essen\)/);
  assert.match(notification?.text ?? "", /https:\/\/example\.com\/chain\//);
});

test("later acceptances also notify accepted participants with email contacts", () => {
  let invite = accept(buildInvite(), "p1", "sulz@example.com");
  invite = accept(invite, "p2", "0176 999999");
  invite = accept(invite, "p3", "langwedel@example.com");

  const notification = buildChainInviteNotification({
    invite,
    respondedParticipantId: "p3",
    decision: "accepted",
    baseUrl: "https://example.com",
    operatorEmail: "omer@example.com",
  });

  assert.ok(notification);
  assert.deepEqual(
    [...(notification?.recipients ?? [])].sort(),
    ["omer@example.com", "sulz@example.com"],
    "responder excluded, phone-number contact excluded, operator included"
  );
  assert.match(notification?.subject ?? "", /Alle haben zugesagt/);
  assert.match(notification?.text ?? "", /Kontakte sind jetzt auf der Seite sichtbar/);
});

test("a decline produces the geplatzt notification", () => {
  const invite = accept(buildInvite(), "p1", "sulz@example.com");
  const declined = applyChainInviteResponse({
    invite,
    participantId: "p2",
    decision: "declined",
  });
  assert.equal(declined.success, true);
  if (!declined.success) return;

  const notification = buildChainInviteNotification({
    invite: declined.invite,
    respondedParticipantId: "p2",
    decision: "declined",
    baseUrl: "https://example.com",
    operatorEmail: "omer@example.com",
  });

  assert.match(notification?.subject ?? "", /geplatzt/);
  assert.match(notification?.text ?? "", /abgesagt/);
});

test("no recipients means no notification, and operator email is deduped", () => {
  const invite = accept(buildInvite(), "p1");

  const none = buildChainInviteNotification({
    invite,
    respondedParticipantId: "p1",
    decision: "accepted",
    baseUrl: "https://example.com",
    operatorEmail: null,
  });
  assert.equal(none, null);

  let full = accept(invite, "p2", "omer@example.com");
  full = accept(full, "p3");
  const deduped = buildChainInviteNotification({
    invite: full,
    respondedParticipantId: "p3",
    decision: "accepted",
    baseUrl: "https://example.com",
    operatorEmail: "Omer@Example.com",
  });
  assert.deepEqual(deduped?.recipients, ["omer@example.com"]);
});

test("sendChainInviteNotifications is a no-op without RESEND_API_KEY", async () => {
  const invite = accept(buildInvite(), "p1", "sulz@example.com");

  const result = await sendChainInviteNotifications(
    {
      invite,
      respondedParticipantId: "p1",
      decision: "accepted",
      baseUrl: "https://example.com",
    },
    { CHAIN_NOTIFY_EMAIL: "omer@example.com" } as NodeJS.ProcessEnv
  );

  assert.deepEqual(result, { sent: 0 });
});
