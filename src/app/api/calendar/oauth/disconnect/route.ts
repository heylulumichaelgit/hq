import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const googleEmail: string | undefined = body.googleEmail;

  if (googleEmail) {
    // Disconnect a specific Google account
    await supabase
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", user.id)
      .eq("google_email", googleEmail);

    // Remove calendar selections that belonged to this Google account
    await supabase
      .from("google_calendar_selections")
      .delete()
      .eq("user_id", user.id)
      .eq("google_email", googleEmail);
  } else {
    // Disconnect all Google accounts
    await supabase
      .from("google_calendar_tokens")
      .delete()
      .eq("user_id", user.id);

    await supabase
      .from("google_calendar_selections")
      .delete()
      .eq("user_id", user.id);
  }

  return NextResponse.json({ success: true });
}
