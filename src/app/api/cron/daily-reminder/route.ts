import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@example.com";
const TZ = process.env.FAMILY_TIMEZONE || "Asia/Nicosia";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const PERSON_IDS: Record<string, string | undefined> = {
  Andrew:     process.env.SUPABASE_HQ_ANDREW_ID,
  Chrystalla: process.env.SUPABASE_HQ_CHRYSTALLA_ID,
  Lulu:       process.env.SUPABASE_HQ_LULU_ID,
};

async function sendPush(
  sub: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: string,
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    return true;
  } catch (err: unknown) {
    const statusCode =
      err instanceof Error && "statusCode" in err
        ? (err as { statusCode: number }).statusCode
        : 0;
    if (statusCode === 410 || statusCode === 404) {
      await supabase.from("push_subscriptions").delete().eq("id", sub.id);
    }
    return false;
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  const supabase = await createClient();

  // Determine today's date in the family's timezone
  const nowLocal = toZonedTime(new Date(), TZ);
  const todayStr = format(nowLocal, "yyyy-MM-dd");
  const dayStart = startOfDay(nowLocal).toISOString();
  const dayEnd = endOfDay(nowLocal).toISOString();

  // Idempotency: claim today's run before sending. If the row already exists
  // (Vercel retry, duplicate invocation), skip the whole run — prevents
  // duplicate pushes. Uses the service-role client to bypass RLS.
  const admin = createAdminClient();
  const { error: claimError } = await admin
    .from("daily_reminder_runs")
    .insert({ run_date: todayStr } as never);
  if (claimError) {
    if (claimError.code === "23505") {
      return NextResponse.json({ ok: true, skipped: "already sent today", todayStr });
    }
    return NextResponse.json(
      { error: "Failed to claim run", detail: claimError.message },
      { status: 500 }
    );
  }

  // ── Fetch todos ──────────────────────────────────────────
  const { data: todos = [] } = await supabase
    .from("todos")
    .select("id, title, due_date, assigned_to, parent_id")
    .eq("is_completed", false)
    .lte("due_date", todayStr)
    .is("parent_id", null);

  // ── Fetch today's family events (overlap: starts before day end AND ends after day start) ──
  const { data: events = [] } = await supabase
    .from("family_events")
    .select("id, title, start_at, all_day")
    .lt("start_at", dayEnd)
    .gt("end_at", dayStart)
    .order("start_at");

  const eventCount = events?.length ?? 0;

  // Build a short event preview (first event title, or count)
  function eventSummary(count: number): string {
    if (count === 0) return "";
    if (count === 1) return events![0].title;
    return `${count} events`;
  }

  // Group todos by person
  const byPerson = new Map<string, typeof todos>();
  for (const todo of todos ?? []) {
    const people =
      todo.assigned_to === "Both"
        ? ["Andrew", "Chrystalla"]
        : todo.assigned_to.split(",").map((p: string) => p.trim()).filter(Boolean);
    for (const person of people) {
      if (!byPerson.has(person)) byPerson.set(person, []);
      byPerson.get(person)!.push(todo);
    }
  }

  // Ensure every known person gets a notification (even with 0 todos, if there are events)
  const allPeople = Object.keys(PERSON_IDS);
  for (const person of allPeople) {
    if (!byPerson.has(person)) byPerson.set(person, []);
  }

  const results: Record<string, string> = {};

  for (const [person, personTodos] of byPerson.entries()) {
    const userId = PERSON_IDS[person];
    if (!userId) continue;

    const todayCount = (personTodos ?? []).filter((t) => t.due_date === todayStr).length;
    const overdueCount = (personTodos ?? []).filter((t) => t.due_date !== todayStr).length;

    // Skip if nothing to report
    if (todayCount === 0 && overdueCount === 0 && eventCount === 0) {
      results[person] = "nothing to report";
      continue;
    }

    // Build notification body
    const parts: string[] = [];

    if (todayCount > 0 && overdueCount > 0) {
      parts.push(`${todayCount} due today, ${overdueCount} overdue`);
    } else if (todayCount === 1) {
      parts.push((personTodos ?? []).find((t) => t.due_date === todayStr)!.title);
    } else if (todayCount > 1) {
      parts.push(`${todayCount} tasks due`);
    } else if (overdueCount > 0) {
      parts.push(`${overdueCount} overdue task${overdueCount > 1 ? "s" : ""}`);
    }

    if (eventCount > 0) {
      parts.push(eventSummary(eventCount));
    }

    const body = parts.join(" · ");

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subs?.length) {
      results[person] = "no subscriptions";
      continue;
    }

    const payload = JSON.stringify({
      title: `Good morning, ${person}! ☀️`,
      body,
      url: "/todos/today",
    });

    let sent = 0;
    for (const sub of subs) {
      if (await sendPush(sub, payload, supabase)) sent++;
    }
    results[person] = `sent ${sent}/${subs.length}`;
  }

  return NextResponse.json({ ok: true, results, todayStr, eventCount, todoCount: todos?.length ?? 0 });
}
