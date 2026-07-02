import { NextResponse } from "next/server";

import { attachContactsIfAccepted } from "@/lib/chain-contacts";
import { createStoredChainProposal, readChainProposals } from "@/lib/chain-proposal-store";
import { validateChainProposalInput } from "@/lib/chain-proposals";

export async function GET() {
  const proposals = await readChainProposals();
  const proposalsWithContacts = await Promise.all(
    proposals.map((proposal) => attachContactsIfAccepted(proposal))
  );

  return NextResponse.json({
    proposals: proposalsWithContacts,
    count: proposalsWithContacts.length,
  });
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { message: "Please send a valid JSON payload." },
      { status: 400 }
    );
  }

  const validation = validateChainProposalInput(payload);

  if (!validation.success) {
    return NextResponse.json(
      {
        message: validation.errors[0],
        errors: validation.errors,
      },
      { status: 400 }
    );
  }

  const result = await createStoredChainProposal(validation.data);

  if (!result.success) {
    return NextResponse.json(
      {
        message: result.message,
        proposal: result.conflict,
      },
      { status: 409 }
    );
  }

  return NextResponse.json(
    {
      message: "Chain proposal created.",
      proposal: result.proposal,
    },
    { status: 201 }
  );
}

