import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// TEMPORARY diagnostic endpoint. Remove after verifying Supabase wiring.
export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const diagnostics: Record<string, unknown> = {
    hasUrl: Boolean(url),
    hasKey: Boolean(key),
    urlPrefix: url ? url.slice(0, 24) : null,
    keyPrefix: key ? key.slice(0, 11) : null,
  };

  if (!url || !key) {
    return NextResponse.json({ ok: false, reason: "missing-env", diagnostics });
  }

  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await supabase.from("waitlist_entries").insert({
      email: "debug-probe@example.com",
      use_case: "debug probe - safe to delete",
      created_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({
        ok: false,
        reason: "insert-error",
        error: { message: error.message, code: error.code, details: error.details, hint: error.hint },
        diagnostics,
      });
    }

    return NextResponse.json({ ok: true, diagnostics });
  } catch (caught) {
    return NextResponse.json({
      ok: false,
      reason: "exception",
      error: caught instanceof Error ? caught.message : String(caught),
      diagnostics,
    });
  }
}
