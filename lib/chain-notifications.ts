import {
  deriveChainInviteStatus,
  type ChainInvite,
  type ChainInviteDecision,
} from "@/lib/chain-invites";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isLikelyEmail(value: string | null | undefined): value is string {
  return Boolean(value && emailPattern.test(value.trim()));
}

export type ChainNotification = {
  recipients: string[];
  subject: string;
  text: string;
};

/**
 * Build the notification for a response event. Pure so it can be tested
 * without any mail infrastructure.
 *
 * Recipients are people who have already consented into the loop: the
 * operator (if configured) plus every participant who accepted AND left
 * an email-shaped contact — excluding whoever just responded (they were
 * on the page and already know).
 */
export function buildChainInviteNotification(input: {
  invite: ChainInvite;
  respondedParticipantId: string;
  decision: ChainInviteDecision;
  baseUrl: string;
  operatorEmail?: string | null;
}): ChainNotification | null {
  const { invite, respondedParticipantId, decision, baseUrl, operatorEmail } = input;

  const responder = invite.participants.find((p) => p.id === respondedParticipantId);
  const responderLabel = responder?.label ?? "Ein Teilnehmer";
  const status = deriveChainInviteStatus(invite);
  const acceptedCount = invite.participants.filter((p) => p.status === "accepted").length;
  const total = invite.participants.length;
  const chainUrl = `${baseUrl.replace(/\/$/, "")}/chain/${invite.id}`;

  const recipients = new Set<string>();

  if (isLikelyEmail(operatorEmail)) {
    recipients.add(operatorEmail.trim().toLowerCase());
  }

  for (const participant of invite.participants) {
    if (
      participant.id !== respondedParticipantId &&
      participant.status === "accepted" &&
      isLikelyEmail(participant.contact)
    ) {
      recipients.add(participant.contact.trim().toLowerCase());
    }
  }

  if (recipients.size === 0) {
    return null;
  }

  let subject: string;
  let body: string;

  if (decision === "declined") {
    subject = `Ringtausch "${invite.title}": leider geplatzt`;
    body = [
      `${responderLabel} hat beim Ringtausch "${invite.title}" abgesagt.`,
      "Damit kommt dieser Ring leider nicht zustande.",
      "",
      `Details: ${chainUrl}`,
    ].join("\n");
  } else if (status === "accepted") {
    subject = `Ringtausch "${invite.title}": Alle haben zugesagt! 🎉`;
    body = [
      `${responderLabel} hat als Letzte(r) zugesagt — der Ring steht!`,
      "Die geteilten Kontakte sind jetzt auf der Seite sichtbar.",
      "Schreibt euch direkt und klärt den Versand gemeinsam:",
      "alle verschicken gleichzeitig und teilen vorher die Sendungsnummern.",
      "",
      `Zur Kette: ${chainUrl}`,
    ].join("\n");
  } else {
    subject = `Ringtausch "${invite.title}": ${responderLabel} ist dabei (${acceptedCount}/${total})`;
    body = [
      `${responderLabel} hat beim Ringtausch "${invite.title}" zugesagt.`,
      `Stand: ${acceptedCount} von ${total} Zusagen.`,
      "",
      `Zur Kette: ${chainUrl}`,
    ].join("\n");
  }

  return {
    recipients: [...recipients],
    subject,
    text: body,
  };
}

/**
 * Send via Resend's REST API. Degrades to a no-op when RESEND_API_KEY is
 * not configured, and never throws — a failed notification must not break
 * the response that triggered it.
 */
export async function sendChainInviteNotifications(
  input: {
    invite: ChainInvite;
    respondedParticipantId: string;
    decision: ChainInviteDecision;
    baseUrl: string;
  },
  env: NodeJS.ProcessEnv = process.env
): Promise<{ sent: number }> {
  const apiKey = env.RESEND_API_KEY;

  if (!apiKey) {
    return { sent: 0 };
  }

  const notification = buildChainInviteNotification({
    ...input,
    operatorEmail: env.CHAIN_NOTIFY_EMAIL ?? null,
  });

  if (!notification) {
    return { sent: 0 };
  }

  const from = env.CHAIN_EMAIL_FROM || "BarterChain <onboarding@resend.dev>";
  let sent = 0;

  for (const recipient of notification.recipients) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: recipient,
          subject: notification.subject,
          text: notification.text,
        }),
      });

      if (response.ok) {
        sent += 1;
      } else {
        console.error(
          `[barterchain] notification to ${recipient} failed: ${response.status}`
        );
      }
    } catch (error) {
      console.error(`[barterchain] notification to ${recipient} failed`, error);
    }
  }

  return { sent };
}
