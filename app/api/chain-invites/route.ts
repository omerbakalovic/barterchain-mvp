import { NextResponse } from "next/server";

import { canAccessAdminSignals } from "@/lib/admin-access";
import {
  deriveChainInviteStatus,
  validateChainInviteInput,
} from "@/lib/chain-invites";
import {
  createStoredChainInvite,
  readChainInvites,
} from "@/lib/chain-invite-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (!canAccessAdminSignals({ key: searchParams.get("key") })) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const invites = await readChainInvites();

  return NextResponse.json({
    invites: invites.map((invite) => ({
      ...invite,
      status: deriveChainInviteStatus(invite),
    })),
    count: invites.length,
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

  if (!canAccessAdminSignals({ key: `${payload.key ?? ""}` })) {
    return NextResponse.json({ message: "Not found." }, { status: 404 });
  }

  const validation = validateChainInviteInput(payload);

  if (!validation.success) {
    return NextResponse.json(
      { message: validation.errors[0], errors: validation.errors },
      { status: 400 }
    );
  }

  const persisted = await createStoredChainInvite(validation.data);

  if (!persisted) {
    return NextResponse.json(
      { message: "Chain invite could not be stored." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    {
      message: "Chain invite created.",
      invite: validation.data,
      url: `/chain/${validation.data.id}`,
    },
    { status: 201 }
  );
}
