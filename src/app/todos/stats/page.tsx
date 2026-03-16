"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  startOfWeek,
  subWeeks,
  isSameWeek,
  format,
  getDay,
} from "date-fns";
import { useTodos } from "@/features/todos/queries";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import type { Todo } from "@/lib/supabase/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const PEOPLE = ["Andrew", "Chrystalla", "Lulu"] as const;
type Person = (typeof PEOPLE)[number];

const PERSON_COLORS: Record<Person, string> = {
  Andrew: "#C4956A",
  Chrystalla: "#8B7D6B",
  Lulu: "#B5A8A0",
};

const RANK_BADGE: Record<number, string> = { 1: "👑", 2: "🥈", 3: "🥉" };

const PRIORITY_COLORS = {
  high: "var(--destructive)",
  medium: "#d97706",
  low: "var(--muted-foreground)",
};

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getAssignedPeople(assignedTo: string): string[] {
  if (assignedTo === "Both") return ["Andrew", "Chrystalla"];
  return assignedTo.split(",").map((p) => p.trim()).filter(Boolean);
}

function getPersonScore(todos: Todo[], person: Person): number {
  return todos
    .filter((t) => t.is_completed)
    .reduce((sum, t) => {
      const people = getAssignedPeople(t.assigned_to);
      return people.includes(person) ? sum + (people.length > 1 ? 0.5 : 1) : sum;
    }, 0);
}

function getWeekScore(todos: Todo[], person: Person, weekStart: Date): number {
  return todos
    .filter((t) => {
      if (!t.is_completed) return false;
      const completedAt = new Date(t.completed_at ?? t.updated_at);
      return isSameWeek(completedAt, weekStart, { weekStartsOn: 1 });
    })
    .reduce((sum, t) => {
      const people = getAssignedPeople(t.assigned_to);
      return people.includes(person) ? sum + (people.length > 1 ? 0.5 : 1) : sum;
    }, 0);
}

// ── Chart configs ─────────────────────────────────────────────────────────────

const weeklyChartConfig: ChartConfig = {
  Andrew: { label: "Andrew", color: PERSON_COLORS.Andrew },
  Chrystalla: { label: "Chrystalla", color: PERSON_COLORS.Chrystalla },
  Lulu: { label: "Lulu", color: PERSON_COLORS.Lulu },
};

const trendChartConfig: ChartConfig = {
  total: { label: "Completed", color: PERSON_COLORS.Andrew },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.3 },
  }),
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { data: todos = [] } = useTodos();
  const { setSlot } = useHeaderSlot();

  useEffect(() => {
    setSlot(<span className="text-sm font-semibold">Stats</span>);
    return () => setSlot(null);
  }, [setSlot]);

  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const lastWeekStart = subWeeks(thisWeekStart, 1);

  // Leaderboard
  const leaderboard = useMemo(() =>
    PEOPLE.map((person) => ({ person, score: getPersonScore(todos, person) }))
      .sort((a, b) => b.score - a.score),
    [todos]
  );

  // 4-week stacked bar data
  const weeklyBarData = useMemo(() => {
    return [3, 2, 1, 0].map((weeksAgo) => {
      const weekStart = subWeeks(thisWeekStart, weeksAgo);
      const entry: Record<string, string | number> = {
        week: format(weekStart, "MMM d"),
      };
      for (const person of PEOPLE) {
        entry[person] = getWeekScore(todos, person, weekStart);
      }
      return entry;
    });
  }, [todos, thisWeekStart]);

  // 8-week trend line
  const trendData = useMemo(() => {
    return [7, 6, 5, 4, 3, 2, 1, 0].map((weeksAgo) => {
      const weekStart = subWeeks(thisWeekStart, weeksAgo);
      const total = PEOPLE.reduce(
        (sum, person) => sum + getWeekScore(todos, person, weekStart),
        0
      );
      return { week: format(weekStart, "MMM d"), total: Math.round(total * 10) / 10 };
    });
  }, [todos, thisWeekStart]);

  // Priority donut
  const priorityData = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const t of todos.filter((t) => t.is_completed)) {
      if (t.priority in counts) counts[t.priority as keyof typeof counts]++;
    }
    return [
      { name: "High", value: counts.high, color: PRIORITY_COLORS.high },
      { name: "Medium", value: counts.medium, color: PRIORITY_COLORS.medium },
      { name: "Low", value: counts.low, color: PRIORITY_COLORS.low },
    ].filter((d) => d.value > 0);
  }, [todos]);

  // Day-of-week heatmap
  const dowData = useMemo(() => {
    const counts = Array(7).fill(0);
    for (const t of todos.filter((t) => t.is_completed && t.completed_at)) {
      counts[getDay(new Date(t.completed_at!))]++;
    }
    return DOW_LABELS.map((day, i) => ({ day, count: counts[i] }));
  }, [todos]);

  // This week vs last week
  const streaks = useMemo(() =>
    PEOPLE.map((person) => ({
      person,
      thisWeek: getWeekScore(todos, person, thisWeekStart),
      lastWeek: getWeekScore(todos, person, lastWeekStart),
    })),
    [todos, thisWeekStart, lastWeekStart]
  );

  const totalCompleted = todos.filter((t) => t.is_completed).length;
  const totalOpen = todos.filter((t) => !t.is_completed).length;

  return (
    <div className="space-y-5">

      {/* Summary row */}
      <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible"
        className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Completed</p>
            <p className="text-3xl font-bold mt-1">{totalCompleted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Open</p>
            <p className="text-3xl font-bold mt-1">{totalOpen}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Leaderboard */}
      <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Family Karma Leaderboard</CardTitle>
            <CardDescription>All-time tasks completed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {leaderboard.map(({ person, score }, idx) => (
              <motion.div key={person} className="flex items-center gap-3"
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + idx * 0.08 }}>
                <span className="w-6 text-center text-lg">{RANK_BADGE[idx + 1] ?? idx + 1}</span>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                  style={{ backgroundColor: PERSON_COLORS[person] }}>
                  {person[0]}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{person}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {score % 1 === 0 ? score : score.toFixed(1)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${leaderboard[0].score > 0 ? (score / leaderboard[0].score) * 100 : 0}%`,
                        backgroundColor: PERSON_COLORS[person],
                      }} />
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* 4-week stacked bar chart */}
      <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Weekly Completion</CardTitle>
            <CardDescription>Tasks completed per person, last 4 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={weeklyChartConfig} className="h-[200px] w-full">
              <BarChart data={weeklyBarData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {PEOPLE.map((person) => (
                  <Bar key={person} dataKey={person} stackId="a"
                    fill={`var(--color-${person})`} radius={person === "Lulu" ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* 8-week trend line */}
      <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Completion Trend</CardTitle>
            <CardDescription>Total tasks completed per week, last 8 weeks</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendChartConfig} className="h-[180px] w-full">
              <LineChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11 }}
                  interval={1} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="total" stroke={`var(--color-total)`}
                  strokeWidth={2} dot={{ r: 3, fill: `var(--color-total)` }}
                  activeDot={{ r: 5 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Priority breakdown + Day-of-week side by side */}
      <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible"
        className="grid grid-cols-2 gap-3">

        {/* Priority donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">By Priority</CardTitle>
            <CardDescription className="text-xs">Completed tasks</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {priorityData.length > 0 ? (
              <>
                <ChartContainer config={{}} className="h-[120px] w-full">
                  <PieChart>
                    <Pie data={priorityData} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                      dataKey="value" paddingAngle={2}>
                      {priorityData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ChartContainer>
                <div className="flex flex-col gap-1 mt-2 w-full">
                  {priorityData.map((d) => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="ml-auto font-medium tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground py-8 text-center">No completed tasks yet</p>
            )}
          </CardContent>
        </Card>

        {/* Day of week */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Best Days</CardTitle>
            <CardDescription className="text-xs">Tasks completed by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ count: { label: "Tasks", color: PERSON_COLORS.Andrew } }}
              className="h-[160px] w-full">
              <BarChart data={dowData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* This week vs last week */}
      <motion.div custom={5} variants={cardVariants} initial="hidden" animate="visible">
        <h2 className="text-xs font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
          This Week vs Last Week
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {streaks.map(({ person, thisWeek, lastWeek }, idx) => {
            const diff = thisWeek - lastWeek;
            const isUp = diff >= 0;
            return (
              <motion.div key={person}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + idx * 0.08 }}>
                <Card className="flex flex-col items-center p-4 gap-2">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: PERSON_COLORS[person] }}>
                    {person[0]}
                  </div>
                  <span className="text-xs font-medium text-center">{person}</span>
                  <span className="text-2xl font-bold tabular-nums">
                    {thisWeek % 1 === 0 ? thisWeek : thisWeek.toFixed(1)}
                  </span>
                  <div className={`flex items-center gap-1 text-xs font-medium ${isUp ? "text-primary" : "text-destructive"}`}>
                    {isUp ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                    <span>
                      {diff === 0 ? "Same" : `${isUp ? "+" : ""}${diff % 1 === 0 ? diff : diff.toFixed(1)}`}
                    </span>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

    </div>
  );
}
