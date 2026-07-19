import { NextResponse } from "next/server";

import {
  applyChainInviteResponse,
  deriveChainInviteStatus,
  sanitizeChainInvite,
  type ChainInviteDecision,
} from "@/lib/chain-invites";
import {
  findChainInviteById,
  updateStoredChainInvite,
} from "@/lib/chain-invite-store";

function resolveDecision(value: unknown): ChainInviteDecision | null {
  if (value === "accepted" || value === "accept") return "accepted";
  if (value === "declined" || value === "decline") return "declined";
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const invite = await findChainInviteById(id);

  if (!invite) {
    return NextResponse.json({ message: "Chain not found." }, { status: 404 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { message: "Please send a valid JSON payload." },
      { status: 400 }
    );
  }

  const participantId = `${payload.participantId ?? ""}`.trim();
  const decision = resolveDecision(payload.decision);
  const contact =
    typeof payload.contact === "string" && payload.contact.trim()
      ? payload.contact
      : undefined;

  if (!participantId) {
    return NextResponse.json({ message: "participantId is required." }, { status: 400 });
  }

  if (!decision) {
    return NextResponse.json(
      { message: "decision must be 'accepted' or 'declined'." },
      { status: 400 }
    );
  }

  const result = applyChainInviteResponse({
    invite,
    participantId,
    decision,
    contact,
  });

  if (!result.success) {
    return NextResponse.json({ message: result.message }, { status: 409 });
  }

  const updated = await updateStoredChainInvite(result.invite);

  if (!updated) {
    return NextResponse.json(
      { message: "Chain invite could not be updated." },
      { status: 500 }
    );
  }

  const sanitized = sanitizeChainInvite(updated);
  const status = deriveChainInviteStatus(sanitized);

  return NextResponse.json({
    message:
      status === "accepted"
        ? "Alle Teilnehmer haben zugesagt."
        : decision === "accepted"
          ? "Zusage gespeichert."
          : "Absage gespeichert.",
    invite: {
      ...sanitized,
      status,
    },
  });
}
