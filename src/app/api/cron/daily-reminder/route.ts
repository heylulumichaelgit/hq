import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { format, startOfDay, isPast } from "date-fns";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@example.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// Map assigned_to values to profile IDs from env
const PERSON_IDS: Record<string, string | undefined> = {
  Andrew:     process.env.SUPABASE_HQ_ANDREW_ID,
  Chrystalla: process.env.SUPABASE_HQ_CHRYSTALLA_ID,
  Lulu:       process.env.SUPABASE_HQ_LULU_ID,
};

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized calls
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
  const todayStr = format(new Date(), "yyyy-MM-dd");

  // Fetch all incomplete todos due today or overdue
  const { data: todos, error } = await supabase
    .from("todos")
    .select("id, title, due_date, assigned_to, parent_id")
    .eq("is_completed", false)
    .lte("due_date", todayStr)
    .is("parent_id", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!todos?.length) {
    return NextResponse.json({ message: "No todos due today" });
  }

  const todayTodos = todos.filter((t) => t.due_date === todayStr);
  const overdueTodos = todos.filter((t) => t.due_date !== todayStr);

  // Group by person
  const byPerson = new Map<string, typeof todos>();
  for (const todo of todos) {
    const people =
      todo.assigned_to === "Both"
        ? ["Andrew", "Chrystalla"]
        : [todo.assigned_to];
    for (const person of people) {
      if (!byPerson.has(person)) byPerson.set(person, []);
      byPerson.get(person)!.push(todo);
    }
  }

  // Send notifications
  const results: Record<string, string> = {};

  for (const [person, personTodos] of byPerson.entries()) {
    const userId = PERSON_IDS[person];
    if (!userId) continue;

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (!subs?.length) continue;

    const todayCount = personTodos.filter((t) => t.due_date === todayStr).length;
    const overdueCount = personTodos.filter((t) => t.due_date !== todayStr).length;

    let body = "";
    if (todayCount > 0 && overdueCount > 0) {
      body = `${todayCount} due today, ${overdueCount} overdue`;
    } else if (todayCount > 0) {
      body = todayCount === 1
        ? personTodos.find((t) => t.due_date === todayStr)!.title
        : `${todayCount} tasks due today`;
    } else {
      body = `${overdueCount} overdue task${overdueCount > 1 ? "s" : ""}`;
    }

    const payload = JSON.stringify({
      title: `Good morning, ${person}! ☀️`,
      body,
      url: "/todos/today",
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err: unknown) {
        const statusCode = err instanceof Error && "statusCode" in err
          ? (err as { statusCode: number }).statusCode : 0;
        if (statusCode === 410 || statusCode === 404) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }
    results[person] = `sent ${sent}/${subs.length}`;
  }

  return NextResponse.json({ ok: true, results, todayCount: todayTodos.length, overdueCount: overdueTodos.length });
}
