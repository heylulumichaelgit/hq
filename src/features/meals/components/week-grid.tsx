"use client";

import { useMemo } from "react";
import { addDays, format } from "date-fns";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MealCell } from "./meal-cell";
import { useMealPlans } from "../queries";
import type { MealPlan } from "../queries";

const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const;
type MealType = (typeof MEAL_TYPES)[number];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
};

interface WeekGridProps {
  weekStart: Date;
  createdBy?: string | null;
}

export function WeekGrid({ weekStart, createdBy }: WeekGridProps) {
  const weekStartIso = format(weekStart, "yyyy-MM-dd");
  const { data: meals = [], isLoading } = useMealPlans(weekStartIso);

  // Build a lookup: "day_of_week:meal_type" → MealPlan
  const mealMap = useMemo(() => {
    const map = new Map<string, MealPlan>();
    for (const m of meals) {
      map.set(`${m.day_of_week}:${m.meal_type}`, m);
    }
    return map;
  }, [meals]);

  // Generate day columns: Mon → Sun (display order)
  // day_of_week in DB: 0=Sun, 1=Mon, ..., 6=Sat
  // Display: index 0=Mon(1), 1=Tue(2), ..., 5=Sat(6), 6=Sun(0)
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const dayOfWeek = i === 6 ? 0 : i + 1;
      return {
        dayOfWeek,
        label: format(d, "EEE d"),
      };
    });
  }, [weekStart]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: one card per day, 3 meal rows inside ── */}
      <div className="md:hidden space-y-3">
        {days.map(({ dayOfWeek, label }, idx) => (
          <motion.div
            key={`mobile-day-${dayOfWeek}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <Card>
              <CardContent className="p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  {label}
                </p>
                <div className="space-y-1.5">
                  {MEAL_TYPES.map((mealType) => (
                    <div key={mealType} className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground w-[60px] shrink-0 uppercase tracking-wide">
                        {MEAL_LABELS[mealType]}
                      </span>
                      <div className="flex-1">
                        <MealCell
                          weekStart={weekStartIso}
                          dayOfWeek={dayOfWeek}
                          mealType={mealType}
                          meal={mealMap.get(`${dayOfWeek}:${mealType}`)}
                          createdBy={createdBy}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Desktop: table layout with meal-type rows × day columns ── */}
      <div className="hidden md:block overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row: empty label cell + day headers */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-2 mb-1">
            <div />
            {days.map(({ dayOfWeek, label }) => (
              <div
                key={`hdr-${dayOfWeek}`}
                className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide pb-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* One row per meal type */}
          {MEAL_TYPES.map((mealType, rowIdx) => (
            <div
              key={mealType}
              className="grid grid-cols-[80px_repeat(7,1fr)] gap-2 mb-2"
            >
              {/* Meal type label */}
              <div className="flex items-center">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {MEAL_LABELS[mealType]}
                </span>
              </div>

              {/* Cell for each day */}
              {days.map(({ dayOfWeek }, colIdx) => (
                <motion.div
                  key={`${mealType}-${dayOfWeek}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rowIdx * 0.05 + colIdx * 0.02 }}
                >
                  <MealCell
                    weekStart={weekStartIso}
                    dayOfWeek={dayOfWeek}
                    mealType={mealType}
                    meal={mealMap.get(`${dayOfWeek}:${mealType}`)}
                    createdBy={createdBy}
                  />
                </motion.div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
