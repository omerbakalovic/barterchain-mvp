export type ChainInviteDecision = "accepted" | "declined";
export type ChainInviteParticipantStatus = "pending" | ChainInviteDecision;

export type ChainInviteParticipant = {
  id: string;
  label: string;
  gives: string;
  wants: string;
  listingUrl: string | null;
  status: ChainInviteParticipantStatus;
  respondedAt: string | null;
  /** Optional contact shared on accept; revealed only once every participant accepted. */
  contact: string | null;
};

export type ChainInvite = {
  id: string;
  title: string;
  note: string | null;
  participants: ChainInviteParticipant[];
  createdAt: string;
  updatedAt: string;
};

export type ChainInviteStatus = "pending" | "accepted" | "declined";

export function deriveChainInviteStatus(invite: ChainInvite): ChainInviteStatus {
  if (invite.participants.some((participant) => participant.status === "declined")) {
    return "declined";
  }

  if (
    invite.participants.length > 0 &&
    invite.participants.every((participant) => participant.status === "accepted")
  ) {
    return "accepted";
  }

  return "pending";
}

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type ChainInviteValidationResult =
  | { success: true; data: ChainInvite }
  | { success: false; errors: string[] };

export function createChainInviteId() {
  return globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export function validateChainInviteInput(
  payload: Record<string, unknown>
): ChainInviteValidationResult {
  const errors: string[] = [];
  const title = normalizeWhitespace(`${payload.title ?? ""}`);
  const noteRaw = `${payload.note ?? ""}`.trim();
  const participantsRaw = Array.isArray(payload.participants) ? payload.participants : null;

  if (title.length < 3) {
    errors.push("Title must be at least 3 characters.");
  }

  if (!participantsRaw || participantsRaw.length < 3) {
    errors.push("A chain needs at least 3 participants.");
  }

  const participants: ChainInviteParticipant[] = [];

  if (participantsRaw) {
    participantsRaw.forEach((entry, index) => {
      const record = (entry ?? {}) as Record<string, unknown>;
      const label = normalizeWhitespace(`${record.label ?? ""}`);
      const gives = normalizeWhitespace(`${record.gives ?? ""}`);
      const wants = normalizeWhitespace(`${record.wants ?? ""}`);
      const listingUrl = normalizeWhitespace(`${record.listingUrl ?? ""}`);

      if (label.length < 2) {
        errors.push(`Participant ${index + 1}: label is required.`);
      }

      if (gives.length < 2) {
        errors.push(`Participant ${index + 1}: gives is required.`);
      }

      if (wants.length < 2) {
        errors.push(`Participant ${index + 1}: wants is required.`);
      }

      if (listingUrl && !isValidHttpUrl(listingUrl)) {
        errors.push(`Participant ${index + 1}: listing URL must be a valid http(s) URL.`);
      }

      participants.push({
        id: `p${index + 1}`,
        label,
        gives,
        wants,
        listingUrl: listingUrl || null,
        status: "pending",
        respondedAt: null,
        contact: null,
      });
    });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  const now = new Date().toISOString();

  return {
    success: true,
    data: {
      id: createChainInviteId(),
      title,
      note: noteRaw || null,
      participants,
      createdAt: now,
      updatedAt: now,
    },
  };
}

export type ChainInviteResponseResult =
  | { success: true; invite: ChainInvite }
  | { success: false; message: string };

export function applyChainInviteResponse(input: {
  invite: ChainInvite;
  participantId: string;
  decision: ChainInviteDecision;
  contact?: string;
}): ChainInviteResponseResult {
  const status = deriveChainInviteStatus(input.invite);

  if (status === "declined") {
    return { success: false, message: "This chain has already been declined." };
  }

  if (status === "accepted") {
    return { success: false, message: "This chain has already been fully accepted." };
  }

  const participant = input.invite.participants.find(
    (entry) => entry.id === input.participantId
  );

  if (!participant) {
    return { success: false, message: "Unknown participant." };
  }

  if (participant.status !== "pending") {
    return { success: false, message: "This participant has already responded." };
  }

  const now = new Date().toISOString();
  const contact = input.contact ? normalizeWhitespace(input.contact).slice(0, 200) : null;

  const participants = input.invite.participants.map((entry) =>
    entry.id === input.participantId
      ? {
          ...entry,
          status: input.decision,
          respondedAt: now,
          contact: input.decision === "accepted" ? contact : null,
        }
      : entry
  );

  return {
    success: true,
    invite: {
      ...input.invite,
      participants,
      updatedAt: now,
    },
  };
}

/**
 * Contacts are consent-gated: they only leave the server once every
 * participant has accepted. Until then (and after any decline) the
 * public payload carries no contact values.
 */
export function sanitizeChainInvite(invite: ChainInvite): ChainInvite {
  const revealContacts = deriveChainInviteStatus(invite) === "accepted";

  if (revealContacts) {
    return invite;
  }

  return {
    ...invite,
    participants: invite.participants.map((participant) => ({
      ...participant,
      contact: null,
    })),
  };
}
