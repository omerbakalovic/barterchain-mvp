import { NextResponse } from "next/server";

import { readStoredListings, saveListing } from "@/lib/listing-store";
import { validateListingInput } from "@/lib/listings";

export async function GET() {
  const listings = await readStoredListings();

  return NextResponse.json({
    listings,
    count: listings.length,
  });
}

export async function POST(request: Request) {
  try {
    let payload: Record<string, unknown>;

    try {
      payload = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { message: "Please send a valid JSON payload." },
        { status: 400 }
      );
    }

    const validation = validateListingInput(payload);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: validation.errors[0],
          errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const listing = await saveListing(validation.data);
    const destination = listing.source === "supabase" ? "Supabase" : "local storage";

    return NextResponse.json(
      {
        message: `Listing created and saved to ${destination}.`,
        listing,
        source: listing.source,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[listings] POST failed", error);
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Could not create listing. Configure Supabase for durable storage on Vercel.",
      },
      { status: 500 }
    );
  }
}
