import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAuthedClient, fetchCalendarEvents } from "@/lib/google-calendar";
import type { GoogleCalendarToken, GoogleCalendarSelection, Profile } from "@/lib/supabase/types";
import { NextRequest, NextResponse } from "next/server";

// Colour assigned to each user in the family view
const USER_COLORS: Record<string, string> = {
  Andrew: "#3b82f6",      // blue-500
  Chrystalla: "#a855f7",  // purple-500
};
const FALLBACK_COLOR = "#6b7280"; // gray-500

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("start");
  const timeMax = searchParams.get("end");

  if (!timeMin || !timeMax) {
    return NextResponse.json({ error: "start and end params required" }, { status: 400 });
  }

  // Use admin client to read all household members' tokens (bypasses RLS)
  const admin = createAdminClient();

  const { data: allTokens } = await admin
    .from("google_calendar_tokens")
    .select("user_id, refresh_token, access_token, token_expiry") as {
      data: Pick<GoogleCalendarToken, "user_id" | "refresh_token" | "access_token" | "token_expiry">[] | null;
    };

  if (!allTokens || allTokens.length === 0) {
    return NextResponse.json({ events: [] });
  }

  // Get profiles to map user_id → display_name
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, display_name") as { data: Pick<Profile, "id" | "display_name">[] | null };

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.display_name])
  );

  // Get all calendar selections (admin to read all users')
  const { data: allSelections } = await admin
    .from("google_calendar_selections")
    .select("user_id, calendar_id, calendar_name, show_in_family_view, color") as {
      data: Pick<GoogleCalendarSelection, "user_id" | "calendar_id" | "calendar_name" | "show_in_family_view" | "color">[] | null;
    };

  type SelectionRow = Pick<GoogleCalendarSelection, "user_id" | "calendar_id" | "calendar_name" | "show_in_family_view" | "color">;
  const selectionsByUser = (allSelections ?? [])
    .filter((s) => s.show_in_family_view)
    .reduce<Record<string, SelectionRow[]>>((acc, s) => {
      if (!acc[s.user_id]) acc[s.user_id] = [];
      acc[s.user_id]!.push(s);
      return acc;
    }, {});

  // Fetch events for each connected user
  const allEvents = await Promise.all(
    allTokens.map(async (token) => {
      const displayName = profileMap[token.user_id] ?? "Unknown";
      const userColor = USER_COLORS[displayName] ?? FALLBACK_COLOR;
      const selections: SelectionRow[] = selectionsByUser[token.user_id] ?? [];

      if (selections.length === 0) return [];

      const authClient = createAuthedClient({
        refresh_token: token.refresh_token,
        access_token: token.access_token,
        expiry_date: token.token_expiry
          ? new Date(token.token_expiry).getTime()
          : null,
      });

      // Fetch all selected calendars in parallel
      const eventArrays = await Promise.allSettled(
        selections.map((sel) =>
          fetchCalendarEvents(
            authClient,
            sel.calendar_id,
            sel.calendar_name,
            sel.color ?? userColor,
            timeMin,
            timeMax
          )
        )
      );

      const events = eventArrays
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchCalendarEvents>>> => r.status === "fulfilled")
        .flatMap((r) => r.value);

      return events.map((e) => ({
        ...e,
        userId: token.user_id,
        userDisplayName: displayName,
        userColor,
        source: "google" as const,
      }));
    })
  );

  return NextResponse.json({ events: allEvents.flat() });
}
