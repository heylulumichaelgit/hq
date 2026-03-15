"use client";

import { useState, useMemo } from "react";
import { useTodos } from "@/features/todos/queries";
import { TodoItem } from "@/features/todos/components/todo-item";
import { motion, AnimatePresence } from "framer-motion";
import { startOfWeek, isSameWeek, format, startOfDay } from "date-fns";
import { Archive, ChevronDown, Loader2, Trophy } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Todo } from "@/lib/supabase/types";

type PersonFilter = "All" | "Andrew" | "Chrystalla" | "Lulu" | "Both";

const PERSON_FILTERS: PersonFilter[] = ["All", "Andrew", "Chrystalla", "Lulu", "Both"];

function getWeekLabel(weekStart: Date, now: Date): string {
  if (isSameWeek(weekStart, now, { weekStartsOn: 1 })) {
    return "This week";
  }
  const lastWeek = new Date(now);
  lastWeek.setDate(now.getDate() - 7);
  if (isSameWeek(weekStart, lastWeek, { weekStartsOn: 1 })) {
    return "Last week";
  }
  return format(weekStart, "'Week of' MMM d");
}

export default function CompletedPage() {
  const { data: todos, isLoading } = useTodos();
  const [activeFilter, setActiveFilter] = useState<PersonFilter>("All");

  const { completedTodos, weekGroups } = useMemo(() => {
    if (!todos) return { completedTodos: [], weekGroups: [] };

    const completed = todos.filter((t) => t.is_completed && !t.parent_id);

    const filtered =
      activeFilter === "All"
        ? completed
        : completed.filter((t) => t.assigned_to === activeFilter);

    // Group by week start (Monday)
    const weekMap = new Map<number, Todo[]>();
    for (const t of filtered) {
      const weekStart = startOfWeek(new Date(t.completed_at ?? t.updated_at), { weekStartsOn: 1 });
      const key = weekStart.getTime();
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(t);
    }

    // Sort weeks newest first
    const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => b - a);

    return {
      completedTodos: filtered,
      weekGroups: sortedWeeks.map(([timestamp, weekTodos]) => ({
        weekStart: new Date(timestamp),
        weekTodos,
      })),
    };
  }, [todos, activeFilter]);

  const allTodos = todos ?? [];
  const now = startOfDay(new Date());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800">
          <Archive className="h-5 w-5 text-zinc-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Completed</h1>
          <p className="text-sm text-muted-foreground">
            {completedTodos.length}{" "}
            {completedTodos.length === 1 ? "task" : "tasks"} completed
          </p>
        </div>
      </div>

      {/* Person filter tabs */}
      <div className="flex flex-wrap gap-1.5">
        {PERSON_FILTERS.map((person) => (
          <button
            key={person}
            onClick={() => setActiveFilter(person)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              activeFilter === person
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {person}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {completedTodos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Nothing completed yet
          </p>
        </div>
      )}

      {/* Week groups */}
      {weekGroups.map(({ weekStart, weekTodos }) => {
        const label = getWeekLabel(weekStart, now);
        const personBreakdown = (["Andrew", "Chrystalla", "Lulu", "Both"] as const)
          .map((p) => {
            const n = weekTodos.filter((t) => t.assigned_to === p).length;
            return n > 0 ? `${p} ${n}` : null;
          })
          .filter(Boolean)
          .join(" · ");

        return (
          <Collapsible key={weekStart.getTime()} defaultOpen>
            <CollapsibleTrigger className="flex w-full flex-col gap-0.5 rounded px-1 py-2 text-left transition-colors hover:bg-accent/50 cursor-pointer">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <ChevronDown className="h-3.5 w-3.5" />
                {label}
                <span className="font-normal">({weekTodos.length})</span>
              </div>
              {personBreakdown && (
                <span className="pl-5 text-xs text-muted-foreground">
                  {personBreakdown}
                </span>
              )}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-1">
                <AnimatePresence mode="popLayout">
                  {weekTodos.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} allTodos={allTodos} />
                  ))}
                </AnimatePresence>
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </motion.div>
  );
}
