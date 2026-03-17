"use client";

import { useState } from "react";
import {
  MapPin,
  CalendarDays,
  Users,
  Wallet,
  BookMarked,
  FileText,
  Pencil,
  Trash2,
  Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useDeleteHoliday } from "../queries";
import type { Holiday } from "../queries";
import { HolidayFormDialog } from "./holiday-form-dialog";

const STATUS_STYLES: Record<
  Holiday["status"],
  { label: string; classes: string }
> = {
  planning: {
    label: "Planning",
    classes:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-transparent",
  },
  booked: {
    label: "Booked",
    classes:
      "bg-green-500/10 text-green-700 dark:text-green-300 border-transparent",
  },
  completed: {
    label: "Completed",
    classes: "bg-muted text-muted-foreground border-transparent",
  },
  cancelled: {
    label: "Cancelled",
    classes:
      "bg-red-500/10 text-red-700 dark:text-red-300 border-transparent",
  },
};

function formatDateRange(
  start: string | null,
  end: string | null
): string | null {
  if (!start && !end) return null;

  const fmt = (d: string) => {
    // Parse as local date (YYYY-MM-DD) to avoid UTC offset shifts
    const [year, month, day] = d.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  if (start) return `From ${fmt(start)}`;
  return `Until ${fmt(end!)}`;
}

function getDaysUntil(start: string): number {
  const [year, month, day] = start.split("-").map(Number);
  const startDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round(
    (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
}

interface HolidayCardProps {
  holiday: Holiday;
}

export function HolidayCard({ holiday }: HolidayCardProps) {
  const deleteHoliday = useDeleteHoliday();
  const [editOpen, setEditOpen] = useState(false);

  const statusStyle = STATUS_STYLES[holiday.status];
  const dateRange = formatDateRange(holiday.start_date, holiday.end_date);

  const showCountdown =
    holiday.start_date &&
    holiday.status !== "completed" &&
    holiday.status !== "cancelled";
  const daysUntil = showCountdown ? getDaysUntil(holiday.start_date!) : null;
  const isUpcoming = daysUntil !== null && daysUntil > 0;
  const isToday = daysUntil === 0;

  return (
    <>
      <Card className="group transition-shadow hover:shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-base leading-tight">
                {holiday.title}
              </p>
              {holiday.destination && (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" />
                  <span className="truncate">{holiday.destination}</span>
                </div>
              )}
            </div>

            {/* Action buttons — visible on hover */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => setEditOpen(true)}
                aria-label="Edit trip"
              >
                <Pencil className="size-3.5" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label="Delete trip"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove trip?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove{" "}
                      <strong>{holiday.title}</strong> from your trips. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteHoliday.mutate(holiday.id)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          {/* Date range + countdown */}
          {(dateRange || isUpcoming || isToday) && (
            <div className="flex items-center gap-3 flex-wrap">
              {dateRange && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" />
                  <span>{dateRange}</span>
                </div>
              )}
              {isToday && (
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Clock className="size-3.5 shrink-0" />
                  <span>Today!</span>
                </div>
              )}
              {isUpcoming && daysUntil! > 0 && (
                <div className="flex items-center gap-1 text-xs font-medium text-primary">
                  <Clock className="size-3.5 shrink-0" />
                  <span>
                    {daysUntil === 1 ? "Tomorrow" : `${daysUntil} days away`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Status badge */}
          <div>
            <Badge
              variant="secondary"
              className={cn(
                "text-[11px] font-medium px-1.5 py-0",
                statusStyle.classes
              )}
            >
              {statusStyle.label}
            </Badge>
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            {holiday.attendees && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Users className="size-3.5 shrink-0" />
                <span>{holiday.attendees}</span>
              </div>
            )}
            {holiday.budget != null && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Wallet className="size-3.5 shrink-0" />
                <span>
                  {holiday.currency}{" "}
                  {holiday.budget.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {holiday.booking_ref && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookMarked className="size-3.5 shrink-0" />
                <span className="font-mono">{holiday.booking_ref}</span>
              </div>
            )}
            {holiday.notes && (
              <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <FileText className="size-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-2 italic">{holiday.notes}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <HolidayFormDialog
        holiday={holiday}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
