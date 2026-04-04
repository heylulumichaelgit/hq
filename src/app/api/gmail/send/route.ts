import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, isAllowedGmailAccount } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthedClient } from "@/lib/google-calendar";
import { sendMessage } from "@/lib/google-gmail";
import type { GoogleCalendarToken } from "@/lib/supabase/types";

export async function POST(request: NextRequest) {
  if (!validateApiKey(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { to, subject, body: emailBody, cc, bcc, replyTo, threadId, inReplyTo, google_email } = body;

  if (!google_email) {
    return NextResponse.json({ error: "google_email required" }, { status: 400 });
  }
  if (!isAllowedGmailAccount(google_email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!to || !subject || !emailBody) {
    return NextResponse.json({ error: "to, subject, and body required" }, { status: 400 });
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
    const result = await sendMessage(authClient, to, subject, emailBody, {
      cc,
      bcc,
      replyTo,
      threadId,
      inReplyTo,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error("Gmail send error:", err instanceof Error ? err.message : "Unknown error");
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
