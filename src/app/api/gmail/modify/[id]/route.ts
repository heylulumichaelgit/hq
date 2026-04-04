import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isAllowedGmailAccount } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthedClient } from "@/lib/google-calendar";
import { modifyMessage } from "@/lib/google-gmail";
import type { GoogleCalendarToken } from "@/lib/supabase/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: messageId } = await params;
  const body = await request.json();
  const { addLabelIds, removeLabelIds, google_email } = body;

  if (!google_email) {
    return NextResponse.json({ error: "google_email required" }, { status: 400 });
  }

  if (!isAllowedGmailAccount(google_email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: token } = await admin
    .from("google_calendar_tokens")
    .select("refresh_token, access_token, token_expiry")
    .eq("google_email", google_email)
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
    const result = await modifyMessage(authClient, messageId, addLabelIds, removeLabelIds);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Gmail modify error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Failed to modify message" }, { status: 500 });
  }
}
