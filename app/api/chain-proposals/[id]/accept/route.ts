import { NextResponse } from "next/server";

import { findChainProposalById, updateChainProposal } from "@/lib/chain-proposal-store";
import {
  applyChainProposalDecision,
  CHAIN_PROPOSAL_DECLINED,
  type ChainProposal,
} from "@/lib/chain-proposals";

function getListingId(payload: Record<string, unknown>) {
  return `${payload.listingId ?? ""}`.trim();
}

function resolveTerminalMessage(proposal: ChainProposal) {
  if (proposal.status === CHAIN_PROPOSAL_DECLINED) {
    return "This proposal has already been declined.";
  }

  return "This proposal has already been fully accepted.";
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const proposal = await findChainProposalById(id);

  if (!proposal) {
    return NextResponse.json({ message: "Proposal not found." }, { status: 404 });
  }

  if (proposal.status !== "pending") {
    return NextResponse.json(
      {
        message: resolveTerminalMessage(proposal),
        proposal,
      },
      { status: 409 }
    );
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

  const listingId = getListingId(payload);

  if (!listingId) {
    return NextResponse.json({ message: "listingId is required." }, { status: 400 });
  }

  const decision = applyChainProposalDecision({
    proposal,
    listingId,
    decision: "accepted",
  });

  if (!decision.success) {
    return NextResponse.json({ message: decision.message }, { status: 400 });
  }

  const updatedProposal = await updateChainProposal(decision.proposal);

  if (!updatedProposal) {
    return NextResponse.json({ message: "Proposal not found." }, { status: 404 });
  }

  return NextResponse.json({
    message:
      updatedProposal.status === "accepted"
        ? "All participants accepted this proposal."
        : "Participant accepted the proposal.",
    proposal: updatedProposal,
  });
}

