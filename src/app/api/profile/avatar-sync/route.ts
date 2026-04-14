import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAuthedClient } from "@/lib/google-calendar";
import { getGoogleUserProfile } from "@/lib/google-gmail";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GoogleCalendarToken } from "@/lib/supabase/types";

async function fetchGoogleAvatarForUser(userId: string) {
  const admin = createAdminClient();
  const { data: tokens } = await admin
    .from("google_calendar_tokens")
    .select("google_email, refresh_token, access_token, token_expiry")
    .eq("user_id", userId)
    .order("created_at", { ascending: true }) as {
      data: Pick<GoogleCalendarToken, "google_email" | "refresh_token" | "access_token" | "token_expiry">[] | null;
    };

  for (const token of tokens ?? []) {
    try {
      const auth = createAuthedClient({
        refresh_token: token.refresh_token,
        access_token: token.access_token,
        expiry_date: token.token_expiry ? new Date(token.token_expiry).getTime() : null,
      });
      const profile = await getGoogleUserProfile(auth);
      if (profile.picture) {
        return {
          avatarUrl: profile.picture,
          source: `google:${token.google_email}`,
          name: profile.name,
        };
      }
    } catch {
      // Try next connected Google account.
    }
  }

  return null;
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const avatar = await fetchGoogleAvatarForUser(user.id);

  if (!avatar?.avatarUrl) {
    return NextResponse.json(
      { error: "No Google profile photo found. Reconnect Google to grant profile access or upload one manually." },
      { status: 404 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      avatar_url: avatar.avatarUrl,
      display_name: avatar.name || undefined,
    })
    .eq("id", user.id)
    .select("id, display_name, email, avatar_url")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    profile: data,
    source: avatar.source,
  });
}
