import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: tokens } = await supabase
    .from("google_calendar_tokens")
    .select("google_email")
    .eq("user_id", user.id);

  const googleEmails = (tokens ?? []).map((t) => t.google_email as string);

  return NextResponse.json({
    connected: googleEmails.length > 0,
    googleEmails,
    // backward-compat field
    googleEmail: googleEmails[0] ?? null,
  });
}
