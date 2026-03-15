"use client";

import { useMemo } from "react";
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
import { useGoogleCalendarEvents, useFamilyEvents, useDeleteFamilyEvent } from "../queries";
import type { GoogleCalendarEvent, FamilyEvent } from "../queries";
import { Trash2, List, CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Calendar grid: 7am–10pm = 15 hours
const HOUR_START = 7;
const HOUR_END = 22;
const TOTAL_HOURS = HOUR_END - HOUR_START;
const HOUR_HEIGHT = 64; // px per hour

type DisplayEvent = {
  key: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  source: "google" | "family";
  familyEventId?: string;
  userLabel?: string;
};

function toDisplayEvent(e: GoogleCalendarEvent): DisplayEvent {
  return {
    key: `google-${e.id}`,
    title: e.title,
    start: parseISO(e.start),
    end: parseISO(e.end),
    allDay: e.allDay,
    color: e.userColor,
    source: "google",
    userLabel: e.userDisplayName,
  };
}

function toDisplayFamilyEvent(e: FamilyEvent): DisplayEvent {
  return {
    key: `family-${e.id}`,
    title: e.title,
    start: parseISO(e.start_at),
    end: parseISO(e.end_at),
    allDay: e.all_day,
    color: "#8FA48A",
    source: "family",
    familyEventId: e.id,
  };
}

// ─── Schedule View ────────────────────────────────────────────────────────────

function ScheduleEventRow({
  event,
  onDelete,
}: {
  event: DisplayEvent;
  onDelete?: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-accent/50 transition-colors group">
      <div
        className="h-2.5 w-2.5 rounded-full shrink-0 mt-0.5"
        style={{ backgroundColor: event.color }}
      />
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
      {event.source === "family" && onDelete && (
        <button
          onClick={() => onDelete(event.familyEventId!)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

function ScheduleView() {
  const today = startOfDay(new Date());
  const timeMin = today.toISOString();
  const timeMax = addDays(today, 60).toISOString();

  const { data: googleEvents = [], isLoading: loadingGoogle } =
    useGoogleCalendarEvents(timeMin, timeMax);
  const { data: familyEvents = [], isLoading: loadingFamily } =
    useFamilyEvents(timeMin, timeMax);
  const deleteFamilyEvent = useDeleteFamilyEvent();

  const isLoading = loadingGoogle || loadingFamily;

  const allEvents: DisplayEvent[] = useMemo(
    () => [
      ...googleEvents.map(toDisplayEvent),
      ...familyEvents.map(toDisplayFamilyEvent),
    ],
    [googleEvents, familyEvents]
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
                onDelete={
                  event.source === "family"
                    ? (id) => deleteFamilyEvent.mutate(id)
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Week View ────────────────────────────────────────────────────────────────

interface EventChipProps {
  event: DisplayEvent;
  onDelete?: (id: string) => void;
}

function EventChip({ event, onDelete }: EventChipProps) {
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
    <div
      className="absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 overflow-hidden group cursor-default"
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
      {event.source === "family" && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(event.familyEventId!);
          }}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      )}
    </div>
  );
}

// ─── Main CalendarView ────────────────────────────────────────────────────────

export function CalendarView() {
  const { weekStart, goBack, goForward, goToToday, view, setView } =
    useCalendarStore();

  const timeMin = weekStart.toISOString();
  const timeMax = addDays(weekStart, 7).toISOString();

  const { data: googleEvents = [], isLoading: loadingGoogle } =
    useGoogleCalendarEvents(timeMin, timeMax);
  const { data: familyEvents = [], isLoading: loadingFamily } =
    useFamilyEvents(timeMin, timeMax);
  const deleteFamilyEvent = useDeleteFamilyEvent();

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const hours = useMemo(
    () => Array.from({ length: TOTAL_HOURS }, (_, i) => HOUR_START + i),
    []
  );

  const weekAllEvents: DisplayEvent[] = useMemo(
    () => [
      ...googleEvents.map(toDisplayEvent),
      ...familyEvents.map(toDisplayFamilyEvent),
    ],
    [googleEvents, familyEvents]
  );

  const allDayEvents = weekAllEvents.filter((e) => e.allDay);
  const timedEvents = weekAllEvents.filter((e) => !e.allDay);

  function eventsForDay(day: Date, events: DisplayEvent[]) {
    return events.filter((e) => isSameDay(e.start, day));
  }

  const isWeekLoading = loadingGoogle || loadingFamily;

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
          {/* View toggle */}
          <div className="flex items-center rounded-lg border p-0.5 gap-0.5">
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
      {view === "schedule" ? (
        <ScheduleView />
      ) : (
        <>
          {/* Day headers */}
          <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b">
            <div />
            {days.map((day) => (
              <div
                key={day.toISOString()}
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
            ))}
          </div>

          {/* All-day row */}
          {allDayEvents.length > 0 && (
            <div className="grid grid-cols-[40px_repeat(7,1fr)] border-b py-1">
              <div className="flex items-start justify-end pr-2 pt-1">
                <span className="text-[9px] text-muted-foreground">all day</span>
              </div>
              {days.map((day) => (
                <div key={day.toISOString()} className="relative px-0.5 min-h-[24px]">
                  {eventsForDay(day, allDayEvents).map((e) => (
                    <div
                      key={e.key}
                      className="mb-0.5 truncate rounded px-1 py-0.5 text-[10px] font-medium"
                      style={{
                        backgroundColor: e.color + "33",
                        borderLeft: `3px solid ${e.color}`,
                        color: e.color,
                      }}
                    >
                      {e.title}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Scrollable time grid */}
          <div className="overflow-y-auto overflow-x-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
            <div
              className="grid grid-cols-[40px_repeat(7,minmax(80px,1fr))]"
              style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
            >
              {/* Hour labels */}
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

              {/* Day columns */}
              {days.map((day) => (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "relative border-r",
                    isToday(day) && "bg-primary/5"
                  )}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-border/50"
                      style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
                    />
                  ))}
                  {eventsForDay(day, timedEvents).map((e) => (
                    <EventChip
                      key={e.key}
                      event={e}
                      onDelete={
                        e.source === "family"
                          ? (id) => deleteFamilyEvent.mutate(id)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
