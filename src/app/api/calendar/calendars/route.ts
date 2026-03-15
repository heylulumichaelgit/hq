import { createClient } from "@/lib/supabase/server";
import { createAuthedClient } from "@/lib/google-calendar";
import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: token } = await supabase
    .from("google_calendar_tokens")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!token) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 404 });
  }

  const authClient = createAuthedClient({
    refresh_token: token.refresh_token,
    access_token: token.access_token,
    expiry_date: token.token_expiry ? new Date(token.token_expiry).getTime() : null,
  });

  const cal = google.calendar({ version: "v3", auth: authClient });
  const { data } = await cal.calendarList.list();

  const calendars = (data.items ?? []).map((c) => ({
    id: c.id,
    name: c.summary,
    color: c.backgroundColor,
    primary: c.primary ?? false,
  }));

  return NextResponse.json({ calendars });
}
