import { createClient } from "@/lib/supabase/server";
import { createOAuth2Client } from "@/lib/google-calendar";
import { google } from "googleapis";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${APP_URL}/calendar?error=google_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${APP_URL}/calendar?error=invalid_callback`);
  }

  // Validate CSRF state
  const cookieStore = await cookies();
  const savedState = cookieStore.get("gcal_oauth_state")?.value;
  if (!savedState || savedState !== state) {
    return NextResponse.redirect(`${APP_URL}/calendar?error=invalid_state`);
  }
  cookieStore.delete("gcal_oauth_state");

  // Get current user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`);
  }

  // Exchange code for tokens
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    return NextResponse.redirect(`${APP_URL}/calendar?error=no_refresh_token`);
  }

  // Get Google account email
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data: googleUser } = await oauth2.userinfo.get();

  // Upsert token record
  const { error: upsertError } = await supabase
    .from("google_calendar_tokens")
    .upsert(
      {
        user_id: user.id,
        google_email: googleUser.email ?? "",
        refresh_token: tokens.refresh_token,
        access_token: tokens.access_token ?? null,
        token_expiry: tokens.expiry_date
          ? new Date(tokens.expiry_date).toISOString()
          : null,
      },
      { onConflict: "user_id" }
    );

  if (upsertError) {
    console.error("Failed to store Google token:", upsertError);
    return NextResponse.redirect(`${APP_URL}/calendar?error=token_store_failed`);
  }

  // Auto-populate calendar selections from Google Calendar list
  const cal = google.calendar({ version: "v3", auth: oauth2Client });
  const { data: calendarList } = await cal.calendarList.list();

  const selections = (calendarList.items ?? []).map((c) => ({
    user_id: user.id,
    calendar_id: c.id ?? "",
    calendar_name: c.summary ?? "",
    show_in_family_view: true,
    is_work_calendar: false,
    color: c.backgroundColor ?? null,
  }));

  if (selections.length > 0) {
    await supabase
      .from("google_calendar_selections")
      .upsert(selections, { onConflict: "user_id,calendar_id" });
  }

  return NextResponse.redirect(`${APP_URL}/calendar?connected=true`);
}
