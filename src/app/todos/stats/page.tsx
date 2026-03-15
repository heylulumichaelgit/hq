"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart2, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { startOfWeek, subWeeks, isSameWeek, format } from "date-fns";
import { useTodos } from "@/features/todos/queries";
import type { Todo } from "@/lib/supabase/types";

type AssignedTo = "Andrew" | "Chrystalla" | "Both" | "Lulu";

const PEOPLE = ["Andrew", "Chrystalla", "Lulu"] as const;
type Person = (typeof PEOPLE)[number];

const PERSON_COLORS: Record<Person, string> = {
  Andrew: "#3b82f6",
  Chrystalla: "#a855f7",
  Lulu: "#22c55e",
};

const RANK_BADGE: Record<number, string> = {
  1: "👑",
  2: "🥈",
  3: "🥉",
};

function getPersonScore(todos: Todo[], person: Person): number {
  let score = 0;
  for (const t of todos) {
    if (!t.is_completed) continue;
    if (t.assigned_to === person) {
      score += 1;
    } else if (t.assigned_to === "Both" && (person === "Andrew" || person === "Chrystalla")) {
      score += 0.5;
    }
  }
  return score;
}

function getWeekScore(todos: Todo[], person: Person, weekStart: Date): number {
  let score = 0;
  for (const t of todos) {
    if (!t.is_completed) continue;
    const updatedAt = new Date(t.updated_at);
    if (!isSameWeek(updatedAt, weekStart, { weekStartsOn: 1 })) continue;
    if (t.assigned_to === person) {
      score += 1;
    } else if (t.assigned_to === "Both" && (person === "Andrew" || person === "Chrystalla")) {
      score += 0.5;
    }
  }
  return score;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.35 },
  }),
};

export default function StatsPage() {
  const { data: todos, isLoading } = useTodos();

  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);

  // Last 4 complete weeks (before this week)
  const fourWeeks = useMemo(() => {
    return [3, 2, 1, 0].map((weeksAgo) => subWeeks(thisWeekStart, weeksAgo));
  }, [thisWeekStart]);

  const leaderboard = useMemo(() => {
    if (!todos) return [];
    return PEOPLE.map((person) => ({
      person,
      score: getPersonScore(todos, person),
    })).sort((a, b) => b.score - a.score);
  }, [todos]);

  const weeklyData = useMemo(() => {
    if (!todos) return [];
    return fourWeeks.map((weekStart) => {
      const perPerson = PEOPLE.map((person) => ({
        person,
        count: getWeekScore(todos, person, weekStart),
      }));
      const total = perPerson.reduce((sum, p) => sum + p.count, 0);
      return { weekStart, perPerson, total };
    });
  }, [todos, fourWeeks]);

  const maxWeekTotal = useMemo(
    () => Math.max(...weeklyData.map((w) => w.total), 1),
    [weeklyData]
  );

  const streaks = useMemo(() => {
    if (!todos) return [];
    return PEOPLE.map((person) => {
      const thisWeek = getWeekScore(todos, person, thisWeekStart);
      const lastWeek = getWeekScore(todos, person, lastWeekStart);
      return { person, thisWeek, lastWeek };
    });
  }, [todos, thisWeekStart, lastWeekStart]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center gap-3 mb-2"
      >
        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
          <BarChart2 className="w-5 h-5 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Stats</h1>
      </motion.div>

      {/* 1. Family Karma Leaderboard */}
      <motion.div
        custom={0}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border bg-card p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold mb-4 text-muted-foreground uppercase tracking-wide text-xs">
          Family Karma Leaderboard
        </h2>
        <div className="space-y-3">
          {leaderboard.map(({ person, score }, idx) => {
            const rank = idx + 1;
            return (
              <motion.div
                key={person}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.1, duration: 0.3 }}
                className="flex items-center gap-3"
              >
                <span className="w-6 text-center text-lg leading-none">
                  {RANK_BADGE[rank] ?? rank}
                </span>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: PERSON_COLORS[person] }}
                >
                  {person[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{person}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {score % 1 === 0 ? score : score.toFixed(1)} done
                    </span>
                  </div>
                  {/* Progress bar relative to #1 */}
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${leaderboard[0].score > 0 ? (score / leaderboard[0].score) * 100 : 0}%`,
                        backgroundColor: PERSON_COLORS[person],
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 2. Weekly Completion Bar Chart */}
      <motion.div
        custom={1}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        className="rounded-2xl border bg-card p-5 shadow-sm"
      >
        <h2 className="text-base font-semibold mb-1 text-muted-foreground uppercase tracking-wide text-xs">
          Weekly Completion
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Last 4 weeks</p>

        {/* Chart */}
        <div className="flex items-end gap-4 justify-center" style={{ height: 160 }}>
          {weeklyData.map(({ weekStart, perPerson, total }) => {
            const barHeight = maxWeekTotal > 0 ? (total / maxWeekTotal) * 120 : 0;
            return (
              <div key={weekStart.toISOString()} className="flex flex-col items-center gap-1 flex-1">
                {/* Total label above bar */}
                <span className="text-xs font-semibold tabular-nums text-foreground/70" style={{ minHeight: 16 }}>
                  {total > 0 ? (total % 1 === 0 ? total : total.toFixed(1)) : ""}
                </span>
                {/* Stacked bar */}
                <div
                  className="w-full max-w-[40px] flex flex-col-reverse rounded-sm overflow-hidden"
                  style={{ height: 120, backgroundColor: "transparent" }}
                >
                  <div
                    className="w-full flex flex-col-reverse rounded-sm overflow-hidden"
                    style={{ height: barHeight }}
                  >
                    {perPerson
                      .filter((p) => p.count > 0)
                      .map(({ person, count }) => {
                        const segHeight = maxWeekTotal > 0 ? (count / maxWeekTotal) * 120 : 0;
                        return (
                          <div
                            key={person}
                            style={{
                              height: segHeight,
                              backgroundColor: PERSON_COLORS[person],
                              flexShrink: 0,
                            }}
                          />
                        );
                      })}
                  </div>
                </div>
                {/* Week label */}
                <span className="text-xs text-muted-foreground mt-1">
                  {format(weekStart, "MMM d")}
                </span>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 justify-center flex-wrap">
          {PEOPLE.map((person) => (
            <div key={person} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: PERSON_COLORS[person] }}
              />
              <span className="text-xs text-muted-foreground">{person}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 3. Streaks / This Week vs Last Week */}
      <motion.div
        custom={2}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
        <h2 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          This Week vs Last Week
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {streaks.map(({ person, thisWeek, lastWeek }, idx) => {
            const diff = thisWeek - lastWeek;
            const isUp = diff >= 0;
            return (
              <motion.div
                key={person}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + idx * 0.08, duration: 0.3 }}
                className="rounded-2xl border bg-card p-4 shadow-sm flex flex-col items-center gap-2"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: PERSON_COLORS[person] }}
                >
                  {person[0]}
                </div>
                <span className="text-xs font-medium text-center leading-tight">{person}</span>
                <span className="text-2xl font-bold tabular-nums">
                  {thisWeek % 1 === 0 ? thisWeek : thisWeek.toFixed(1)}
                </span>
                <div className={`flex items-center gap-1 text-xs font-medium ${isUp ? "text-green-500" : "text-red-400"}`}>
                  {isUp ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {diff === 0
                      ? "Same as last wk"
                      : `${isUp ? "+" : ""}${diff % 1 === 0 ? diff : diff.toFixed(1)} vs last wk`}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
