import { NextResponse } from "next/server";

import {
  deriveChainInviteStatus,
  sanitizeChainInvite,
} from "@/lib/chain-invites";
import { findChainInviteById } from "@/lib/chain-invite-store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const invite = await findChainInviteById(id);

  if (!invite) {
    return NextResponse.json({ message: "Chain not found." }, { status: 404 });
  }

  const sanitized = sanitizeChainInvite(invite);

  return NextResponse.json({
    invite: {
      ...sanitized,
      status: deriveChainInviteStatus(sanitized),
    },
  });
}
