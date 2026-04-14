"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  format,
  startOfDay,
  endOfDay,
  addDays,
  isToday,
  isPast,
  isTomorrow,
  parseISO,
} from "date-fns";
import {
  AlertTriangle,
  CheckCircle2,
  CalendarDays,
  ShoppingCart,
  BarChart2,
  Users,
  Plane,
  Receipt,
  UtensilsCrossed,
  ChevronRight,
  Sun,
  Sunset,
  Moon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { useTodos } from "@/features/todos/queries";
import { useToggleTodo } from "@/features/todos/queries";
import { useFamilyEvents, useGoogleCalendarEvents, useConnectionStatus } from "@/features/calendar/queries";
import { useAuthStore } from "@/features/auth/store";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/supabase/types";
import type { FamilyEvent, GoogleCalendarEvent } from "@/features/calendar/queries";
import { ActivityFeed } from "@/features/home/activity-feed";

// ── Greeting ─────────────────────────────────────────────────────────────────

function getGreeting(): { text: string; Icon: React.ElementType } {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: "Good morning", Icon: Sun };
  if (h >= 12 && h < 18) return { text: "Good afternoon", Icon: Sun };
  if (h >= 18 && h < 22) return { text: "Good evening", Icon: Sunset };
  return { text: "Good night", Icon: Moon };
}

// ── Unified event type ────────────────────────────────────────────────────────

interface DisplayEvent {
  id: string;
  title: string;
  start: Date;
  allDay: boolean;
  color: string;
  source: "family" | "google";
}

function toDisplayEvents(
  familyEvents: FamilyEvent[],
  googleEvents: GoogleCalendarEvent[],
  now: Date
): DisplayEvent[] {
  const family: DisplayEvent[] = familyEvents.map((e) => ({
    id: e.id,
    title: e.title,
    start: parseISO(e.start_at),
    allDay: e.all_day,
    color: "#22c55e",
    source: "family",
  }));

  const google: DisplayEvent[] = googleEvents.map((e) => ({
    id: e.id,
    title: e.title,
    start: parseISO(e.start),
    allDay: e.allDay,
    color: e.userColor,
    source: "google",
  }));

  return [...family, ...google]
    .filter((e) => e.start >= startOfDay(now))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(0, 5);
}

// ── Quick links ───────────────────────────────────────────────────────────────

const quickLinks = [
  { href: "/grocery", label: "Grocery", icon: ShoppingCart, enabled: true },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed, enabled: true },
  { href: "/todos/stats", label: "Stats", icon: BarChart2, enabled: true },
  { href: "/services", label: "Services", icon: Users, enabled: true },
  { href: "/holidays", label: "Holidays", icon: Plane, enabled: true },
  { href: "/expenses", label: "Expenses", icon: Receipt, enabled: true },
];

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  href,
  variant = "default",
  loading,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  href: string;
  variant?: "default" | "warning";
  loading?: boolean;
}) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "transition-colors hover:bg-accent/50 cursor-pointer h-full",
          variant === "warning" && value > 0 && "border-amber-600/40 bg-amber-500/5"
        )}
      >
        <CardContent className="p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {label}
            </span>
            <Icon
              className={cn(
                "size-4",
                variant === "warning" && value > 0
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground"
              )}
            />
          </div>
          {loading ? (
            <Skeleton className="h-8 w-10" />
          ) : (
            <span
              className={cn(
                "text-3xl font-bold leading-none",
                variant === "warning" && value > 0 && "text-amber-600 dark:text-amber-400"
              )}
            >
              {value}
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

const priorityDot: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-amber-500",
  low: "bg-muted-foreground/40",
};

function DashboardTaskRow({ todo }: { todo: Todo }) {
  const toggleTodo = useToggleTodo();
  const overdue =
    todo.due_date &&
    isPast(startOfDay(parseISO(todo.due_date))) &&
    !isToday(parseISO(todo.due_date)) &&
    !todo.is_completed;

  return (
    <div className="flex items-center gap-3 py-2 group">
      <button
        onClick={() =>
          toggleTodo.mutate({
            id: todo.id,
            is_completed: !todo.is_completed,
            recurrence_rule: todo.recurrence_rule,
            due_date: todo.due_date,
          })
        }
        className={cn(
          "size-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors",
          todo.priority ? priorityDot[todo.priority] : "border-muted-foreground/40",
          "hover:border-primary"
        )}
        aria-label="Toggle complete"
      >
        {todo.is_completed && (
          <span className="size-1.5 rounded-full bg-background block" />
        )}
      </button>

      <Link
        href="/todos/today"
        className="flex-1 min-w-0 flex items-center gap-2"
      >
        <span
          className={cn(
            "text-sm truncate",
            todo.is_completed && "line-through text-muted-foreground"
          )}
        >
          {todo.title}
        </span>
        {overdue && (
          <Badge variant="outline" className="shrink-0 text-[10px] border-amber-600/40 text-amber-600 dark:text-amber-400 px-1 py-0">
            overdue
          </Badge>
        )}
      </Link>
    </div>
  );
}

// ── Event row ─────────────────────────────────────────────────────────────────

function EventRow({ event }: { event: DisplayEvent }) {
  const timeLabel = event.allDay
    ? "All day"
    : format(event.start, "h:mm a");
  const dayLabel = isToday(event.start)
    ? "Today"
    : isTomorrow(event.start)
    ? "Tomorrow"
    : format(event.start, "EEE d MMM");

  return (
    <div className="flex items-center gap-3 py-2">
      <span
        className="size-2 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: event.color }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground">
          {dayLabel} · {timeLabel}
        </p>
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { profile } = useAuthStore();
  const { setSlot } = useHeaderSlot();
  const { data: todos, isLoading: todosLoading } = useTodos();
  const { data: connectionStatus } = useConnectionStatus();

  const now = new Date();
  const timeMin = startOfDay(now).toISOString();
  const timeMax = endOfDay(addDays(now, 7)).toISOString();

  const { data: familyEvents = [] } = useFamilyEvents(timeMin, timeMax);
  const { data: googleEvents = [] } = useGoogleCalendarEvents(timeMin, timeMax);

  useEffect(() => {
    setSlot(
      <span className="text-sm font-semibold">Home</span>
    );
    return () => setSlot(null);
  }, [setSlot]);

  const { overdueTodos, todayTodos } = useMemo(() => {
    if (!todos) return { overdueTodos: [], todayTodos: [] };
    const topLevel = todos.filter((t) => !t.parent_id && !t.is_completed);
    const overdue: Todo[] = [];
    const today: Todo[] = [];
    for (const t of topLevel) {
      if (!t.due_date) continue;
      const d = startOfDay(parseISO(t.due_date));
      if (isToday(d)) today.push(t);
      else if (isPast(d)) overdue.push(t);
    }
    return { overdueTodos: overdue, todayTodos: today };
  }, [todos]);

  const displayEvents = useMemo(
    () => toDisplayEvents(familyEvents, connectionStatus?.connected ? googleEvents : [], now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [familyEvents, googleEvents, connectionStatus]
  );

  const dashboardTasks = [...overdueTodos, ...todayTodos].slice(0, 6);
  const { text: greeting, Icon: GreetIcon } = getGreeting();
  const firstName = profile?.display_name?.split(" ")[0] ?? "there";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Greeting */}
      <div className="flex items-center gap-2.5">
        <GreetIcon className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold leading-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-xs text-muted-foreground">
            {format(now, "EEEE, d MMMM yyyy")}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Overdue"
          value={overdueTodos.length}
          icon={AlertTriangle}
          href="/todos/today"
          variant="warning"
          loading={todosLoading}
        />
        <StatCard
          label="Today"
          value={todayTodos.length}
          icon={CheckCircle2}
          href="/todos/today"
          loading={todosLoading}
        />
        <StatCard
          label="Events"
          value={displayEvents.filter((e) => isToday(e.start)).length}
          icon={CalendarDays}
          href="/calendar"
          loading={todosLoading}
        />
      </div>

      {/* Today's tasks */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Today's tasks</CardTitle>
            <Link
              href="/todos/today"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              See all <ChevronRight className="size-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {todosLoading ? (
            <div className="space-y-3 py-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          ) : dashboardTasks.length === 0 ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="size-8 mx-auto text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">All clear for today</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {dashboardTasks.map((todo) => (
                <DashboardTaskRow key={todo.id} todo={todo} />
              ))}
              {(overdueTodos.length + todayTodos.length) > 6 && (
                <div className="pt-2">
                  <Link
                    href="/todos/today"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    +{(overdueTodos.length + todayTodos.length) - 6} more tasks
                  </Link>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming events */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Upcoming events</CardTitle>
            <Link
              href="/calendar"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
            >
              Calendar <ChevronRight className="size-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {displayEvents.length === 0 ? (
            <div className="py-6 text-center">
              <CalendarDays className="size-8 mx-auto text-muted-foreground/30" />
              <p className="mt-2 text-sm text-muted-foreground">No events this week</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {displayEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ActivityFeed />

      {/* Quick links */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Quick access
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {quickLinks.map(({ href, label, icon: Icon, enabled }) =>
            enabled ? (
              <Link key={href} href={href}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardContent className="p-4 flex items-center gap-3">
                    <Icon className="size-4 text-muted-foreground shrink-0" />
                    <span className="text-sm font-medium">{label}</span>
                  </CardContent>
                </Card>
              </Link>
            ) : (
              <Card key={href} className="opacity-50">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="size-4 text-muted-foreground shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                </CardContent>
              </Card>
            )
          )}
        </div>
      </div>
    </motion.div>
  );
}
