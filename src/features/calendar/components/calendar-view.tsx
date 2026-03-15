"use client";

import { useMemo } from "react";
import {
  format,
  addDays,
  isSameDay,
  parseISO,
  isToday,
  differenceInMinutes,
} from "date-fns";
import { useCalendarStore } from "../store";
import { useGoogleCalendarEvents, useFamilyEvents, useDeleteFamilyEvent } from "../queries";
import type { GoogleCalendarEvent, FamilyEvent } from "../queries";
import { Trash2 } from "lucide-react";
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
    color: "#22c55e", // green-500
    source: "family",
    familyEventId: e.id,
  };
}

interface EventChipProps {
  event: DisplayEvent;
  onDelete?: (id: string) => void;
}

function EventChip({ event, onDelete }: EventChipProps) {
  const startMinutes = (event.start.getHours() - HOUR_START) * 60 + event.start.getMinutes();
  const durationMinutes = Math.max(differenceInMinutes(event.end, event.start), 30);

  const top = Math.max(0, startMinutes);
  const height = Math.min(durationMinutes, TOTAL_HOURS * 60 - startMinutes);

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded px-1.5 py-0.5 overflow-hidden group cursor-default"
      style={{
        top: (top / 60) * HOUR_HEIGHT,
        height: (height / 60) * HOUR_HEIGHT,
        backgroundColor: event.color + "33", // 20% opacity background
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
        <p className="text-[10px] leading-tight opacity-70 truncate" style={{ color: event.color }}>
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

export function CalendarView() {
  const { weekStart, goBack, goForward, goToToday } = useCalendarStore();

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

  const allEvents: DisplayEvent[] = useMemo(() => [
    ...googleEvents.map(toDisplayEvent),
    ...familyEvents.map(toDisplayFamilyEvent),
  ], [googleEvents, familyEvents]);

  const allDayEvents = allEvents.filter((e) => e.allDay);
  const timedEvents = allEvents.filter((e) => !e.allDay);

  function eventsForDay(day: Date, events: DisplayEvent[]) {
    return events.filter((e) => isSameDay(e.start, day));
  }

  const isLoading = loadingGoogle || loadingFamily;

  return (
    <div className="flex flex-col h-full">
      {/* Navigation */}
      <div className="flex items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goBack}>‹</Button>
          <Button variant="outline" size="sm" onClick={goForward}>›</Button>
          <Button variant="ghost" size="sm" onClick={goToToday}>Today</Button>
        </div>
        <h2 className="text-sm font-medium text-muted-foreground">
          {format(weekStart, "MMMM yyyy")}
        </h2>
        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
        )}
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b">
        <div /> {/* gutter */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "py-2 text-center text-xs font-medium",
              isToday(day) && "text-primary"
            )}
          >
            <div className="uppercase tracking-wide text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
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
        <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b py-1">
          <div className="flex items-start justify-end pr-2 pt-1">
            <span className="text-[10px] text-muted-foreground">all day</span>
          </div>
          {days.map((day) => (
            <div key={day.toISOString()} className="relative px-0.5 min-h-[24px]">
              {eventsForDay(day, allDayEvents).map((e) => (
                <div
                  key={e.key}
                  className="mb-0.5 truncate rounded px-1.5 py-0.5 text-[11px] font-medium"
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
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid grid-cols-[56px_repeat(7,1fr)]"
          style={{ height: TOTAL_HOURS * HOUR_HEIGHT }}
        >
          {/* Hour labels */}
          <div className="relative border-r">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 text-[10px] text-muted-foreground -translate-y-2"
                style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
              >
                {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
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
              {/* Hour grid lines */}
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-border/50"
                  style={{ top: (h - HOUR_START) * HOUR_HEIGHT }}
                />
              ))}

              {/* Timed events */}
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
    </div>
  );
}
