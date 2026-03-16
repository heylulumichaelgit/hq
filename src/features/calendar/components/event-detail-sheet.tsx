"use client";

import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Clock, CalendarDays, User, ExternalLink, Square } from "lucide-react";
import { useDeleteFamilyEvent } from "../queries";
import { cn } from "@/lib/utils";

export interface EventDetail {
  key: string;
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
  color: string;
  source: "google" | "family" | "todo";
  familyEventId?: string;
  description?: string;
  userLabel?: string;
  calendarName?: string;
  priority?: string;
}

interface EventDetailSheetProps {
  event: EventDetail | null;
  onClose: () => void;
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">{icon}</div>
      <div className="text-sm text-foreground/90 leading-snug">{children}</div>
    </div>
  );
}

export function EventDetailSheet({ event, onClose }: EventDetailSheetProps) {
  const deleteFamilyEvent = useDeleteFamilyEvent();

  if (!event) return null;

  const handleDelete = async () => {
    if (!event.familyEventId) return;
    try {
      await deleteFamilyEvent.mutateAsync(event.familyEventId);
      onClose();
    } catch {
      // Error is surfaced via deleteFamilyEvent.isError below
    }
  };

  const timeLabel = event.allDay
    ? format(event.start, "EEEE, MMMM d, yyyy")
    : `${format(event.start, "EEE, MMM d · h:mm a")} – ${
        event.start.toDateString() === event.end.toDateString()
          ? format(event.end, "h:mm a")
          : format(event.end, "EEE, MMM d · h:mm a")
      }`;

  const sourceLabel =
    event.source === "google"
      ? "Google Calendar"
      : event.source === "family"
      ? "Family Event"
      : "Task";

  return (
    <Sheet open={!!event} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-2xl px-5">
        <SheetHeader className="pb-3">
          <div className="flex items-start gap-3">
            {event.source === "todo" ? (
              <Square
                className="mt-1 h-4 w-4 shrink-0"
                style={{ color: event.color }}
                strokeWidth={2.5}
              />
            ) : (
              <div
                className="mt-1.5 h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: event.color }}
              />
            )}
            <SheetTitle className="text-left text-base font-semibold leading-snug">
              {event.title}
            </SheetTitle>
          </div>
          <p className="text-xs text-muted-foreground pl-7">{sourceLabel}</p>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          <Separator />

          <div className="space-y-3">
            <Row icon={<Clock className="h-4 w-4" />}>
              {timeLabel}
              {event.allDay && (
                <span className="ml-2 text-xs text-muted-foreground">(All day)</span>
              )}
            </Row>

            {event.userLabel && (
              <Row icon={<User className="h-4 w-4" />}>
                {event.userLabel}
              </Row>
            )}

            {event.calendarName && (
              <Row icon={<CalendarDays className="h-4 w-4" />}>
                {event.calendarName}
              </Row>
            )}

            {event.description && (
              <>
                <Separator />
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed pl-7">
                  {event.description}
                </p>
              </>
            )}
          </div>

          {event.source === "google" && (
            <p className="text-xs text-muted-foreground pl-7">
              Google Calendar events are read-only.
            </p>
          )}

          {event.source === "todo" && (
            <div className="pl-7">
              <p className="text-xs text-muted-foreground mb-2">
                This is a task with a due date. Manage it from the Inbox.
              </p>
            </div>
          )}

          {event.source === "family" && event.familyEventId && (
            <div className="flex flex-col items-end gap-2 pt-2">
              {deleteFamilyEvent.isError && (
                <p className="text-xs text-destructive">
                  {deleteFamilyEvent.error instanceof Error
                    ? deleteFamilyEvent.error.message
                    : "Failed to delete event"}
                </p>
              )}
              <Button
                variant="destructive"
                size="sm"
                className="gap-2"
                onClick={handleDelete}
                disabled={deleteFamilyEvent.isPending}
              >
                <Trash2 className="h-4 w-4" />
                Delete event
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
