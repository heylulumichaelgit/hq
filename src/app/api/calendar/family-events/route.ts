import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthedClient, createBusyEvent } from "@/lib/google-calendar";
import type { GoogleCalendarToken, GoogleCalendarSelection } from "@/lib/supabase/types";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");

  let query = supabase.from("family_events").select("*").order("start_at");
  if (start) query = query.gte("start_at", start);
  if (end) query = query.lte("start_at", end);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    title: string;
    description?: string;
    start_at: string;
    end_at: string;
    all_day?: boolean;
    create_busy_events?: boolean;
  };

  if (!body.title || !body.start_at || !body.end_at) {
    return NextResponse.json({ error: "title, start_at, end_at required" }, { status: 400 });
  }

  // Create the family event record first
  const { data: familyEvent, error: insertError } = await supabase
    .from("family_events")
    .insert({
      title: body.title,
      description: body.description ?? null,
      start_at: body.start_at,
      end_at: body.end_at,
      all_day: body.all_day ?? false,
      created_by: user.id,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // If requested, create busy events in all users' work calendars
  if (body.create_busy_events) {
    const admin = createAdminClient();

    // Get all tokens for all users
    const { data: allTokens } = await admin
      .from("google_calendar_tokens")
      .select("user_id, refresh_token, access_token, token_expiry") as {
        data: Pick<GoogleCalendarToken, "user_id" | "refresh_token" | "access_token" | "token_expiry">[] | null;
      };

    // Get all work calendars for all users
    const { data: workCalendars } = await admin
      .from("google_calendar_selections")
      .select("user_id, calendar_id")
      .eq("is_work_calendar", true) as {
        data: Pick<GoogleCalendarSelection, "user_id" | "calendar_id">[] | null;
      };

    if (allTokens && workCalendars && workCalendars.length > 0) {
      const tokenMap = Object.fromEntries(
        allTokens.map((t) => [t.user_id, t])
      );

      const gcalEventIds: Record<string, string> = {};

      await Promise.allSettled(
        workCalendars.map(async (wc) => {
          const token = tokenMap[wc.user_id];
          if (!token) return;

          const authClient = createAuthedClient({
            refresh_token: token.refresh_token,
            access_token: token.access_token,
            expiry_date: token.token_expiry
              ? new Date(token.token_expiry).getTime()
              : null,
          });

          const eventId = await createBusyEvent(
            authClient,
            wc.calendar_id,
            body.title,
            body.start_at,
            body.end_at,
            body.all_day ?? false
          );

          // Key: user_id:calendar_id → Google event ID
          gcalEventIds[`${wc.user_id}:${wc.calendar_id}`] = eventId;
        })
      );

      // Store the Google event IDs back on the family event
      if (Object.keys(gcalEventIds).length > 0) {
        await supabase
          .from("family_events")
          .update({ gcal_event_ids: gcalEventIds })
          .eq("id", familyEvent.id);
      }
    }
  }

  return NextResponse.json({ event: familyEvent }, { status: 201 });
}
