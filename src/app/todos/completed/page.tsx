"use client";

import { useState, useMemo, useEffect } from "react";
import { useTodos } from "@/features/todos/queries";
import { TodoItem } from "@/features/todos/components/todo-item";
import { useAllTodoLabels } from "@/features/labels/queries";
import { useCommentCounts } from "@/features/comments/queries";
import { motion, AnimatePresence } from "framer-motion";
import { startOfWeek, isSameWeek, format, startOfDay } from "date-fns";
import { ChevronDown, Loader2, Trophy } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Todo } from "@/lib/supabase/types";
import { useHeaderSlot } from "@/components/layout/header-slot-context";

type PersonFilter = "All" | "Andrew" | "Chrystalla" | "Lulu";

const PERSON_FILTERS: PersonFilter[] = ["All", "Andrew", "Chrystalla", "Lulu"];

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
  const todoLabelsMap = useAllTodoLabels();
  const commentCounts = useCommentCounts();
  const { setSlot } = useHeaderSlot();

  const { completedTodos, weekGroups } = useMemo(() => {
    if (!todos) return { completedTodos: [], weekGroups: [] };

    const completed = todos.filter((t) => t.is_completed && !t.parent_id);

    const filtered =
      activeFilter === "All"
        ? completed
        : completed.filter((t) => {
            const people = t.assigned_to === "Both"
              ? ["Andrew", "Chrystalla"]
              : t.assigned_to.split(",").map((p) => p.trim());
            return people.includes(activeFilter);
          });

    const weekMap = new Map<number, Todo[]>();
    for (const t of filtered) {
      const weekStart = startOfWeek(new Date(t.completed_at ?? t.updated_at), { weekStartsOn: 1 });
      const key = weekStart.getTime();
      if (!weekMap.has(key)) weekMap.set(key, []);
      weekMap.get(key)!.push(t);
    }

    const sortedWeeks = Array.from(weekMap.entries()).sort(([a], [b]) => b - a);

    return {
      completedTodos: filtered,
      weekGroups: sortedWeeks.map(([timestamp, weekTodos]) => ({
        weekStart: new Date(timestamp),
        weekTodos,
      })),
    };
  }, [todos, activeFilter]);

  useEffect(() => {
    setSlot(
      <>
        <span className="text-sm font-semibold shrink-0">Completed</span>
        <div className="flex-1" />
        <div className="flex items-center rounded-md border p-0.5 text-xs shrink-0">
          {PERSON_FILTERS.map((person) => (
            <button
              key={person}
              onClick={() => setActiveFilter(person)}
              className={`rounded px-2.5 py-1 transition-colors ${
                activeFilter === person
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {person}
            </button>
          ))}
        </div>
      </>
    );
    return () => setSlot(null);
  }, [setSlot, activeFilter]);

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
      {completedTodos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Nothing completed yet
          </p>
        </div>
      )}

      {weekGroups.map(({ weekStart, weekTodos }) => {
        const label = getWeekLabel(weekStart, now);
        const personBreakdown = (["Andrew", "Chrystalla", "Lulu"] as const)
          .map((p) => {
            const n = weekTodos.filter((t) => {
              const people = t.assigned_to === "Both"
                ? ["Andrew", "Chrystalla"]
                : t.assigned_to.split(",").map((s) => s.trim());
              return people.includes(p);
            }).length;
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
                    <TodoItem key={todo.id} todo={todo} allTodos={allTodos} todoLabelsMap={todoLabelsMap} commentCountsMap={commentCounts} />
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
