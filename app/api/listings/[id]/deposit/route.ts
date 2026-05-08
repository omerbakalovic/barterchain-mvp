import { NextResponse } from "next/server";

import {
  applyBufferTransition,
  BUFFER_STATUS_DEPOSITED,
  createInitialBufferState,
  isBufferSizeClass,
  type BufferState,
} from "@/lib/buffer";
import {
  findStoredListingById,
  updateStoredListing,
} from "@/lib/listing-store";

type DepositRequestBody = {
  sizeClass?: unknown;
  note?: unknown;
};

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

  let payload: DepositRequestBody;
  try {
    payload = (await request.json()) as DepositRequestBody;
  } catch {
    return NextResponse.json(
      { message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!isBufferSizeClass(payload.sizeClass)) {
    return NextResponse.json(
      { message: "sizeClass must be one of S, M, L, XL." },
      { status: 400 }
    );
  }

  const note = typeof payload.note === "string" ? payload.note : undefined;
  const baseState: BufferState =
    listing.buffer ?? createInitialBufferState(payload.sizeClass);

  if (listing.buffer && listing.buffer.sizeClass !== payload.sizeClass) {
    return NextResponse.json(
      {
        message: "Buffer size class is already set on this listing.",
        currentSizeClass: listing.buffer.sizeClass,
      },
      { status: 409 }
    );
  }

  const transition = applyBufferTransition({
    state: baseState,
    to: BUFFER_STATUS_DEPOSITED,
    note,
  });

  if (!transition.success) {
    return NextResponse.json(
      { message: transition.message, currentStatus: baseState.status },
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

  return NextResponse.json({ listing: updated }, { status: 200 });
}
