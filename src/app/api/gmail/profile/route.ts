import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isAllowedGmailAccount } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthedClient } from "@/lib/google-calendar";
import { getProfile } from "@/lib/google-gmail";
import type { GoogleCalendarToken } from "@/lib/supabase/types";

export async function GET(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const googleEmail = searchParams.get("google_email");
  if (!googleEmail) {
    return NextResponse.json({ error: "google_email param required" }, { status: 400 });
  }

  if (!isAllowedGmailAccount(googleEmail)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: token } = await admin
    .from("google_calendar_tokens")
    .select("refresh_token, access_token, token_expiry")
    .eq("google_email", googleEmail)
    .single() as { data: Pick<GoogleCalendarToken, "refresh_token" | "access_token" | "token_expiry"> | null };

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const authClient = createAuthedClient({
    refresh_token: token.refresh_token,
    access_token: token.access_token,
    expiry_date: token.token_expiry ? new Date(token.token_expiry).getTime() : null,
  });

  try {
    const profile = await getProfile(authClient);
    return NextResponse.json(profile);
  } catch (err) {
    console.error("Gmail profile error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}
