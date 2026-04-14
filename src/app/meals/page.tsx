"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { format, startOfWeek, subWeeks, addWeeks, addDays, isThisWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { WeekGrid } from "@/features/meals/components/week-grid";
import { useMealPlans, useUpsertMeal } from "@/features/meals/queries";
import { useAuthStore } from "@/features/auth/store";
import { toast } from "sonner";

export default function MealsPage() {
  const { setHeader } = useHeaderSlot();
  const { profile } = useAuthStore();

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const prevWeekStart = subWeeks(currentWeekStart, 1);
  const prevWeekIso = format(prevWeekStart, "yyyy-MM-dd");
  const currentWeekIso = format(currentWeekStart, "yyyy-MM-dd");

  const { data: lastWeekMeals = [] } = useMealPlans(prevWeekIso);
  const upsert = useUpsertMeal();

  const handlePrevWeek = useCallback(() => {
    setCurrentWeekStart((d) => subWeeks(d, 1));
  }, []);

  const handleNextWeek = useCallback(() => {
    setCurrentWeekStart((d) => addWeeks(d, 1));
  }, []);

  const weekLabel = isThisWeek(currentWeekStart, { weekStartsOn: 1 })
    ? "This week"
    : `Week of ${format(currentWeekStart, "MMM d")}`;

  const handleCopyLastWeek = useCallback(async () => {
    if (lastWeekMeals.length === 0) {
      toast.error("No meals planned last week to copy");
      return;
    }
    try {
      await Promise.all(
        lastWeekMeals.map((m) =>
          upsert.mutateAsync({
            week_start: currentWeekIso,
            day_of_week: m.day_of_week,
            meal_type: m.meal_type,
            title: m.title,
            notes: m.notes,
            recipe_url: m.recipe_url,
            created_by: profile?.id ?? null,
          })
        )
      );
      toast.success(`Copied ${lastWeekMeals.length} meals from last week`);
    } catch {
      toast.error("Failed to copy meals");
    }
  }, [lastWeekMeals, currentWeekIso, upsert, profile]);

  useEffect(() => {
    setHeader({
      title: "Meals",
      subtitle: weekLabel,
      actions: (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handlePrevWeek}
            aria-label="Previous week"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={handleNextWeek}
            aria-label="Next week"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      ),
    });
    return () => setHeader(null);
  }, [setHeader, handlePrevWeek, handleNextWeek, weekLabel]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Week label + copy button on the content area */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">{weekLabel}</h2>
          <span className="text-xs text-muted-foreground">
            {format(currentWeekStart, "MMM d")}
            {" – "}
            {format(addDays(currentWeekStart, 6), "MMM d, yyyy")}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={handleCopyLastWeek}
          disabled={upsert.isPending}
        >
          <Copy className="size-3" />
          Copy last week
        </Button>
      </div>

      <WeekGrid
        weekStart={currentWeekStart}
        createdBy={profile?.id ?? null}
      />
    </motion.div>
  );
}
