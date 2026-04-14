"use client";

import { useMemo } from "react";
import { differenceInCalendarDays } from "date-fns";
import { Plane, Wallet, Clock3, CheckCircle2, CircleDashed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Holiday } from "../queries";

function getTripLength(holiday: Holiday) {
  if (!holiday.start_date || !holiday.end_date) return null;
  const start = new Date(`${holiday.start_date}T00:00:00`);
  const end = new Date(`${holiday.end_date}T00:00:00`);
  return differenceInCalendarDays(end, start) + 1;
}

export function HolidayPlanningSummary({ holidays }: { holidays: Holiday[] }) {
  const stats = useMemo(() => {
    const upcoming = holidays.filter((h) => h.status === "planning" || h.status === "booked");
    const planning = holidays.filter((h) => h.status === "planning");
    const booked = holidays.filter((h) => h.status === "booked");
    const withBudget = upcoming.filter((h) => h.budget != null);
    const totalBudget = withBudget.reduce((sum, h) => sum + (h.budget ?? 0), 0);
    const avgLengthSource = upcoming.map(getTripLength).filter((days): days is number => days != null);
    const avgLength = avgLengthSource.length
      ? Math.round((avgLengthSource.reduce((sum, days) => sum + days, 0) / avgLengthSource.length) * 10) / 10
      : null;

    return { upcoming, planning, booked, totalBudget, avgLength };
  }, [holidays]);

  const cards = [
    {
      label: "Upcoming trips",
      value: stats.upcoming.length,
      icon: Plane,
    },
    {
      label: "Still planning",
      value: stats.planning.length,
      icon: CircleDashed,
    },
    {
      label: "Booked",
      value: stats.booked.length,
      icon: CheckCircle2,
    },
    {
      label: "Planned budget",
      value: stats.totalBudget > 0 ? `€${stats.totalBudget.toLocaleString()}` : "—",
      icon: Wallet,
    },
    {
      label: "Avg trip length",
      value: stats.avgLength ? `${stats.avgLength}d` : "—",
      icon: Clock3,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <span>{card.label}</span>
                <Icon className="size-4" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold leading-none">{card.value}</div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
