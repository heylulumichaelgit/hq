import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: selections, error } = await supabase
    .from("google_calendar_selections")
    .select("*")
    .eq("user_id", user.id)
    .order("calendar_name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ selections });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    calendar_id: string;
    show_in_family_view?: boolean;
    is_work_calendar?: boolean;
  };

  const { error } = await supabase
    .from("google_calendar_selections")
    .update({
      ...(body.show_in_family_view !== undefined && { show_in_family_view: body.show_in_family_view }),
      ...(body.is_work_calendar !== undefined && { is_work_calendar: body.is_work_calendar }),
    })
    .eq("user_id", user.id)
    .eq("calendar_id", body.calendar_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
