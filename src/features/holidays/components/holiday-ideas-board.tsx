"use client";

import { useMemo } from "react";
import { Lightbulb, MapPin, CalendarRange, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Holiday } from "../queries";

export function HolidayIdeasBoard({ holidays }: { holidays: Holiday[] }) {
  const planning = useMemo(
    () => holidays.filter((holiday) => holiday.status === "planning").slice(0, 6),
    [holidays]
  );

  if (planning.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Lightbulb className="size-4 text-muted-foreground" />
          Planning board
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {planning.map((holiday) => (
          <div key={holiday.id} className="rounded-xl border bg-card/50 p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium leading-tight">{holiday.title}</p>
                {holiday.destination && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {holiday.destination}
                  </p>
                )}
              </div>
              <Badge variant="secondary">Planning</Badge>
            </div>

            {(holiday.start_date || holiday.end_date) && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <CalendarRange className="size-3.5" />
                {holiday.start_date ?? "?"} {holiday.end_date ? `→ ${holiday.end_date}` : ""}
              </p>
            )}

            {holiday.budget != null && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wallet className="size-3.5" />
                {holiday.currency} {holiday.budget.toLocaleString()}
              </p>
            )}

            <div className="rounded-lg bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
              {holiday.notes?.trim()
                ? holiday.notes
                : "No notes yet. Add ideas, bookings, packing thoughts, or timing notes."}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
