import { NextResponse } from "next/server";

import { saveWaitlistEntry } from "@/lib/waitlist-store";

type WaitlistPayload = {
  email?: string;
  useCase?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let payload: WaitlistPayload;

  try {
    payload = (await request.json()) as WaitlistPayload;
  } catch {
    return NextResponse.json(
      { message: "Please send a valid JSON payload." },
      { status: 400 }
    );
  }

  const email = payload.email?.trim().toLowerCase();
  const useCase = payload.useCase?.trim() ?? "";

  if (!email || !emailPattern.test(email)) {
    return NextResponse.json(
      { message: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  const entry = await saveWaitlistEntry({ email, useCase });
  const destination = entry.source === "supabase" ? "Supabase" : "local storage";

  return NextResponse.json({
    message: `Thanks, ${email} is now queued for the BarterChain beta. Saved to ${destination}.`,
    source: entry.source,
  });
}
