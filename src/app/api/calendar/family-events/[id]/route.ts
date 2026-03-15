import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthedClient, deleteBusyEvent } from "@/lib/google-calendar";
import type { GoogleCalendarToken } from "@/lib/supabase/types";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch the event to get gcal_event_ids before deleting
  const { data: event } = await supabase
    .from("family_events")
    .select("gcal_event_ids")
    .eq("id", id)
    .single();

  // Delete any associated Google Calendar busy events
  if (event?.gcal_event_ids && Object.keys(event.gcal_event_ids).length > 0) {
    const admin = createAdminClient();
    const { data: allTokens } = await admin
      .from("google_calendar_tokens")
      .select("user_id, refresh_token, access_token, token_expiry") as {
        data: Pick<GoogleCalendarToken, "user_id" | "refresh_token" | "access_token" | "token_expiry">[] | null;
      };

    const tokenMap = Object.fromEntries(
      (allTokens ?? []).map((t) => [t.user_id, t])
    );

    await Promise.allSettled(
      Object.entries(event.gcal_event_ids as Record<string, string>).map(
        async ([userCalKey, gcalEventId]) => {
          const [userId, calendarId] = userCalKey.split(":");
          const token = tokenMap[userId!];
          if (!token || !calendarId) return;

          const authClient = createAuthedClient({
            refresh_token: token.refresh_token,
            access_token: token.access_token,
            expiry_date: token.token_expiry
              ? new Date(token.token_expiry).getTime()
              : null,
          });

          await deleteBusyEvent(authClient, calendarId, gcalEventId);
        }
      )
    );
  }

  const { error } = await supabase
    .from("family_events")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    title?: string;
    description?: string;
    start_at?: string;
    end_at?: string;
    all_day?: boolean;
  };

  const { data, error } = await supabase
    .from("family_events")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ event: data });
}
