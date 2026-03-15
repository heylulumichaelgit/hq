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

  const { data: token } = await supabase
    .from("google_calendar_tokens")
    .select("google_email")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json({
    connected: !!token,
    googleEmail: token?.google_email ?? null,
  });
}
