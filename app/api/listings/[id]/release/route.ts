import { NextResponse } from "next/server";

import {
  applyBufferTransition,
  BUFFER_STATUS_SHIPPED,
  BUFFER_STATUS_WITHDRAWN,
  calculateAccruedFeeEur,
  type BufferStatus,
} from "@/lib/buffer";
import {
  findStoredListingById,
  updateStoredListing,
} from "@/lib/listing-store";

type ReleaseReason = "shipped" | "withdrawn";

type ReleaseRequestBody = {
  reason?: unknown;
  note?: unknown;
};

function resolveReleaseTarget(reason: unknown): BufferStatus | null {
  if (reason === "shipped") return BUFFER_STATUS_SHIPPED;
  if (reason === "withdrawn") return BUFFER_STATUS_WITHDRAWN;
  return null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const listing = await findStoredListingById(id);

  if (!listing) {
    return NextResponse.json(
      { message: "Listing not found." },
      { status: 404 }
    );
  }

  if (!listing.buffer) {
    return NextResponse.json(
      { message: "Listing has no buffer state to release." },
      { status: 409 }
    );
  }

  let payload: ReleaseRequestBody;
  try {
    payload = (await request.json()) as ReleaseRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const target = resolveReleaseTarget(payload.reason);

  if (!target) {
    return NextResponse.json(
      { message: "reason must be either 'shipped' or 'withdrawn'." },
      { status: 400 }
    );
  }

  const note = typeof payload.note === "string" ? payload.note : undefined;
  const transition = applyBufferTransition({
    state: listing.buffer,
    to: target,
    note,
  });

  if (!transition.success) {
    return NextResponse.json(
      { message: transition.message, currentStatus: listing.buffer.status },
      { status: 409 }
    );
  }

  const updated = await updateStoredListing({
    ...listing,
    buffer: transition.state,
  });

  if (!updated) {
    return NextResponse.json(
      { message: "Listing could not be updated." },
      { status: 500 }
    );
  }

  const accruedFeeEur = calculateAccruedFeeEur(transition.state);

  return NextResponse.json(
    {
      listing: updated,
      reason: target as ReleaseReason,
      accruedFeeEur,
    },
    { status: 200 }
  );
}
