"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";
import {
  format,
  addDays,
  isSameDay,
  parseISO,
  isToday,
  differenceInMinutes,
  startOfDay,
} from "date-fns";
import { useCalendarStore } from "../store";
import { useGoogleCalendarEvents, useFamilyEvents } from "../queries";
import type { GoogleCalendarEvent, FamilyEvent } from "../queries";
import type { Profile } from "@/lib/supabase/types";
import { useTodos } from "@/features/todos/queries";
import type { Todo } from "@/lib/supabase/types";
import { List, CalendarDays, Loader2, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventDetailSheet } from "./event-detail-sheet";
import type { EventDetail } from "./event-detail-sheet";

// Calendar grid: 7am–10pm = 15 hours
const HOUR_START = 7;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT = 64; // px per hour

const TODO_PRIORITY_COLOR: Record<string, string> = {
  high: "#C4956A",
  medium: "#9B8E7E",
  low: "#8B8680",
};

type DisplayEvent = {
  id: string;
  key: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  source: "google" | "family" | "todo";
  familyEventId?: string;
  userLabel?: string;
  description?: string;
  calendarName?: string;
  priority?: string;
};

type CalendarLane = {
  userId: string;
  label: string;
  color: string;
};

function useProfileMap() {
  return useQuery<Record<string, Pick<Profile, "display_name">>>({
    queryKey: ["profiles", "calendar-view"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((profile) => [profile.id, profile]));
    },
  });
}

function toDisplayEvent(e: GoogleCalendarEvent): DisplayEvent {
  return {
    id: e.id,
    key: `google-${e.id}`,
    title: e.title,
    start: parseISO(e.start),
    end: parseISO(e.end),
    allDay: e.allDay,
    color: e.userColor,
    source: "google",
    userLabel: e.userDisplayName,
    calendarName: e.calendarName,
  };
}

function toDisplayFamilyEvent(e: FamilyEvent): DisplayEvent {
  return {
    id: e.id,
    key: `family-${e.id}`,
    title: e.title,
    start: parseISO(e.start_at),
    end: parseISO(e.end_at),
    allDay: e.all_day,
    color: "#8FA48A",
    source: "family",
    familyEventId: e.id,
    description: e.description ?? undefined,
  };
}

function toDisplayTodo(t: Todo): DisplayEvent {
  const day = startOfDay(new Date(t.due_date! + "T00:00:00"));
  return {
    id: t.id,
    key: `todo-${t.id}`,
    title: t.title,
    start: day,
    end: day,
    allDay: true,
    color: TODO_PRIORITY_COLOR[t.priority] ?? "#8B8680",
    source: "todo",
  };
}

// ─── Schedule View ────────────────────────────────────────────────────────────

function ScheduleEventRow({
  event,
  onClick,
}: {
  event: DisplayEvent;
  onClick: (e: DisplayEvent) => void;
}) {
  return (
    <button
      onClick={() => onClick(event)}
      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors text-left"
    >
      {event.source === "todo" ? (
        <Square
          className="h-3 w-3 shrink-0 mt-0.5"
          style={{ color: event.color }}
          strokeWidth={2.5}
        />
      ) : (
        <div
          className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5"
          style={{ backgroundColor: event.color }}
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-snug truncate">{event.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {event.allDay
            ? "All day"
            : `${format(event.start, "h:mm a")} – ${format(event.end, "h:mm a")}`}
          {event.userLabel && (
            <span className="ml-1 opacity-70">· {event.userLabel}</span>
          )}
        </p>
      </div>
    </button>
  );
}

function ScheduleView() {
  const today = startOfDay(new Date());
  const timeMin = today.toISOString();
  const timeMax = addDays(today, 60).toISOString();
  const [selectedEvent, setSelectedEvent] = useState<DisplayEvent | null>(null);

  const { data: googleEvents = [], isLoading: loadingGoogle } =
    useGoogleCalendarEvents(timeMin, timeMax);
  const { data: familyEvents = [], isLoading: loadingFamily } =
    useFamilyEvents(timeMin, timeMax);
  const { data: todos = [] } = useTodos();
  const { data: profileMap = {} } = useProfileMap();

  const isLoading = loadingGoogle || loadingFamily;

  const todoEvents: DisplayEvent[] = useMemo(
    () =>
      todos
        .filter((t) => !t.parent_id && !t.is_completed && t.due_date)
        .map(toDisplayTodo),
    [todos]
  );

  const allEvents: DisplayEvent[] = useMemo(
    () => [
      ...googleEvents.map(toDisplayEvent),
      ...familyEvents.map(toDisplayFamilyEvent),
      ...todoEvents,
    ],
    [googleEvents, familyEvents, todoEvents]
  );

  // Group by day — 60 days, skip empty days
  const groupedDays = useMemo(() => {
    const result: { date: Date; events: DisplayEvent[] }[] = [];
    for (let i = 0; i < 60; i++) {
      const day = addDays(today, i);
      const dayEvents = allEvents
        .filter((e) => isSameDay(e.start, day))
        .sort((a, b) => {
          if (a.allDay && !b.allDay) return -1;
          if (!a.allDay && b.allDay) return 1;
          return a.start.getTime() - b.start.getTime();
        });
      if (dayEvents.length > 0) {
        result.push({ date: day, events: dayEvents });
      }
    }
    return result;
  }, [allEvents]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (groupedDays.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">No upcoming events in the next 60 days</p>
      </div>
    );
  }

  return (
    <div className="overflow-y-auto space-y-1 pb-4">
      {groupedDays.map(({ date, events }) => (
        <div key={date.toISOString()}>
          {/* Day header */}
          <div
            className={cn(
              "sticky top-0 z-10 flex items-center gap-3 px-1 py-2 bg-background/95 backdrop-blur-sm",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl text-center",
                isToday(date)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
            >
              <span className="text-[9px] font-semibold uppercase leading-none">
                {format(date, "EEE")}
              </span>
              <span className="text-base font-bold leading-tight">
                {format(date, "d")}
              </span>
            </div>
            <div className="min-w-0">
              <span
                className={cn(
                  "text-sm font-semibold",
                  isToday(date) ? "text-primary" : "text-foreground"
                )}
              >
                {isToday(date) ? "Today" : format(date, "EEEE")}
              </span>
              <span className="ml-1.5 text-xs text-muted-foreground">
                {format(date, "MMM d")}
              </span>
            </div>
          </div>

          {/* Events for this day */}
          <div className="ml-12 space-y-0.5">
            {events.map((event) => (
              <ScheduleEventRow
                key={event.key}
                event={event}
                onClick={setSelectedEvent}
              />
            ))}
          </div>
        </div>
      ))}
      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface EventChipProps {
  event: DisplayEvent;
  onClick: (e: DisplayEvent) => void;
}

function EventChip({ event, onClick }: EventChipProps) {
  const startMinutes =
    (event.start.getHours() - HOUR_START) * 60 + event.start.getMinutes();
  const durationMinutes = Math.max(
    differenceInMinutes(event.end, event.start),
    30
  );

  const top = Math.max(0, startMinutes);
  const height = Math.min(
    durationMinutes,
    TOTAL_HOURS * 60 - startMinutes
  );

  return (
    <button
      onClick={() => onClick(event)}
      className="absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 overflow-hidden text-left cursor-pointer hover:brightness-95 transition-[filter]"
      style={{
        top: (top / 60) * HOUR_HEIGHT,
        height: (height / 60) * HOUR_HEIGHT,
        backgroundColor: event.color + "33",
        borderLeft: `3px solid ${event.color}`,
      }}
    >
      <p
        className="text-[11px] font-medium leading-tight truncate"
        style={{ color: event.color }}
      >
        {event.title}
      </p>
      {event.userLabel && (
        <p
          className="text-[10px] leading-tight opacity-70 truncate"
          style={{ color: event.color }}
        >
          {event.userLabel}
        </p>
      )}
    </button>
  );
}

function WeekLaneColumn({
  day,
  lane,
  events,
  onClick,
}: {
  day: Date;
  lane: CalendarLane;
  events: DisplayEvent[];
  onClick: (event: DisplayEvent) => void;
}) {
  const dayEvents = events.filter(
    (event) =>
      !event.allDay &&
      isSameDay(event.start, day) &&
      (event.userLabel === lane.label || (event.source === "family" && lane.userId === "family"))
  );

  return (
    <div className="relative border-r last:border-r-0 min-w-[120px]">
      {Array.from({ length: TOTAL_HOURS }, (_, index) => HOUR_START + index).map((hour) => (
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-border/50"
          style={{ top: (hour - HOUR_START) * HOUR_HEIGHT }}
        />
      ))}
      {dayEvents.map((event) => (
        <EventChip key={`${lane.userId}-${event.key}`} event={event} onClick={onClick} />
      ))}
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export function CalendarView() {
  const { weekStart, goBack, goForward, goToToday, view, setView } =
    useCalendarStore();
  const [selectedEvent, setSelectedEvent] = useState<DisplayEvent | null>(null);

  const timeMin = weekStart.toISOString();
  const timeMax = addDays(weekStart, 7).toISOString();

  const { data: googleEvents = [], isLoading: loadingGoogle } =
    useGoogleCalendarEvents(timeMin, timeMax);
  const { data: familyEvents = [], isLoading: loadingFamily } =
    useFamilyEvents(timeMin, timeMax);
  const { data: todos = [] } = useTodos();
  const { data: profileMap = {} } = useProfileMap();

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i),
    []
  );

  const weekTodoEvents: DisplayEvent[] = useMemo(
    () =>
      todos
        .filter((t) => !t.parent_id && !t.is_completed && t.due_date)
        .map(toDisplayTodo),
    [todos]
  );

  const weekAllEvents: DisplayEvent[] = useMemo(
    () => [
      ...googleEvents.map(toDisplayEvent),
      ...familyEvents.map(toDisplayFamilyEvent),
      ...weekTodoEvents,
    ],
    [googleEvents, familyEvents, weekTodoEvents]
  );

  const allDayEvents = weekAllEvents.filter((e) => e.allDay);
  const timedEvents = weekAllEvents.filter((e) => !e.allDay);

  function eventsForDay(day: Date, events: DisplayEvent[]) {
    return events.filter((e) => isSameDay(e.start, day));
  }

  const isWeekLoading = loadingGoogle || loadingFamily;

  const lanes = useMemo<CalendarLane[]>(() => {
    const laneMap = new Map<string, CalendarLane>();

    Object.entries(profileMap).forEach(([id, profile]) => {
      laneMap.set(id, {
        userId: id,
        label: profile.display_name,
        color: "#6b7280",
      });
    });

    googleEvents.forEach((event) => {
      laneMap.set(event.userId, {
        userId: event.userId,
        label: event.userDisplayName,
        color: event.userColor,
      });
    });

    laneMap.set("family", {
      userId: "family",
      label: "Family",
      color: "#8FA48A",
    });

    return Array.from(laneMap.values()).sort((a, b) => {
      if (a.userId === "family") return 1;
      if (b.userId === "family") return -1;
      return a.label.localeCompare(b.label);
    });
  }, [googleEvents, profileMap]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: nav (week only) + view toggle */}
      <div className="flex items-center gap-2 pb-3 flex-wrap">
        {view === "week" && (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={goBack} className="h-8 px-2.5">‹</Button>
            <Button variant="outline" size="sm" onClick={goForward} className="h-8 px-2.5">›</Button>
            <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 px-2.5 text-xs">Today</Button>
          </div>
        )}

        {view === "week" && (
          <h2 className="text-sm font-medium text-muted-foreground flex-1 text-center md:text-left">
            {format(weekStart, "MMMM yyyy")}
          </h2>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {isWeekLoading && view === "week" && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
          )}
          <div className="hidden md:flex items-center rounded-lg border p-0.5 gap-0.5">
            <Button
              variant={view === "schedule" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => setView("schedule")}
            >
              <List className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Schedule</span>
            </Button>
            <Button
              variant={view === "week" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 px-2.5 text-xs gap-1.5"
              onClick={() => setView("week")}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Week</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Conditional view */}
      {view === "schedule" || typeof window !== "undefined" && window.innerWidth < 768 ? (
        <ScheduleView />
      ) : (
        <>
          {/* Day + lane headers */}
          <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] border-b">
            <div />
            {days.map((day) => (
              <div key={day.toISOString()} className="border-r last:border-r-0">
                <div
                  className={cn(
                    "py-2 text-center text-xs font-medium",
                    isToday(day) && "text-primary"
                  )}
                >
                  <div className="uppercase tracking-wide text-muted-foreground text-[10px]">
                    {format(day, "EEE")}
                  </div>
                  <div
                    className={cn(
                      "mx-auto mt-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </div>
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(120px, 1fr))` }}>
                  {lanes.map((lane) => (
                    <div
                      key={`${day.toISOString()}-${lane.userId}`}
                      className="border-t border-r last:border-r-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: lane.color }} />
                        {lane.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* All-day row */}
          {allDayEvents.length > 0 && (
            <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))] border-b py-1">
              <div className="flex items-start justify-end pr-2 pt-1">
                <span className="text-[9px] text-muted-foreground">all day</span>
              </div>
              {days.map((day) => (
                <div key={day.toISOString()} className="border-r last:border-r-0">
                  <div className="grid px-0.5" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(120px, 1fr))` }}>
                    {lanes.map((lane) => {
                      const laneEvents = eventsForDay(day, allDayEvents).filter(
                        (event) => event.userLabel === lane.label || (event.source === "family" && lane.userId === "family")
                      );
                      return (
                        <div key={`${day.toISOString()}-${lane.userId}-all-day`} className="min-h-[24px] border-r last:border-r-0 px-0.5">
                          {laneEvents.map((e) => (
                            <button
                              key={`${lane.userId}-${e.key}`}
                              onClick={() => setSelectedEvent(e)}
                              className="mb-0.5 w-full truncate rounded px-1 py-0.5 text-[10px] font-medium flex items-center gap-1 text-left hover:brightness-95 transition-[filter]"
                              style={{
                                backgroundColor: e.color + "22",
                                borderLeft: `3px solid ${e.color}`,
                                color: e.color,
                              }}
                            >
                              {e.source === "todo" && <Square className="h-2 w-2 shrink-0" strokeWidth={2.5} />}
                              <span className="truncate">{e.title}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scrollable time grid */}
          <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: "calc(100vh - 320px)" }}>
            <div className="grid grid-cols-[40px_repeat(7,minmax(0,1fr))]" style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}>
              <div className="relative border-r">
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-1.5 text-[9px] text-muted-foreground -translate-y-2"
                    style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
                  >
                    {h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`}
                  </div>
                ))}
              </div>

              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn("border-r last:border-r-0", isToday(day) && "bg-primary/5")}
                >
                  <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${lanes.length}, minmax(120px, 1fr))` }}>
                    {lanes.map((lane) => (
                      <WeekLaneColumn
                        key={`${day.toISOString()}-${lane.userId}`}
                        day={day}
                        lane={lane}
                        events={timedEvents}
                        onClick={setSelectedEvent}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}
