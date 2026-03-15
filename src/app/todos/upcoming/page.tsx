"use client";

import { useTodos } from "@/features/todos/queries";
import { useProjects } from "@/features/projects/queries";
import { TodoItem } from "@/features/todos/components/todo-item";
import { useAllTodoLabels } from "@/features/labels/queries";
import { useCommentCounts } from "@/features/comments/queries";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, format, isToday, startOfDay, isSameDay } from "date-fns";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/supabase/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function UpcomingPage() {
  const { data: todos, isLoading } = useTodos();
  const { data: projects = [] } = useProjects();
  const todoLabelsMap = useAllTodoLabels();
  const commentCounts = useCommentCounts();

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDays(startOfDay(new Date()), i)),
    []
  );

  // Map of day key -> todos for that day
  const groupedByDay = useMemo(() => {
    if (!todos) return new Map<string, Todo[]>();

    const topLevel = todos.filter(
      (t) => !t.parent_id && !t.is_completed && t.due_date
    );

    const map = new Map<string, Todo[]>();

    for (const day of days) {
      const key = format(day, "yyyy-MM-dd");
      const matching = topLevel.filter((t) => {
        const due = startOfDay(new Date(t.due_date! + "T00:00:00"));
        return isSameDay(due, day);
      });
      if (matching.length > 0) {
        map.set(key, matching);
      }
    }

    return map;
  }, [todos, days]);

  // Track collapsed state — default all open (collapsed set is empty)
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());

  const toggleDay = (key: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const allTodos = todos ?? [];
  const totalCount = Array.from(groupedByDay.values()).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

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
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
          <CalendarDays className="h-5 w-5 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Upcoming</h1>
          <p className="text-sm text-muted-foreground">Next 14 days</p>
        </div>
      </div>

      {/* Empty state */}
      {totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100/60 dark:bg-blue-900/20">
            <CalendarDays className="h-8 w-8 text-blue-400/60" />
          </div>
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Nothing scheduled
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            No todos due in the next 14 days. Enjoy the calm!
          </p>
        </div>
      )}

      {/* Day groups */}
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayTodos = groupedByDay.get(key);
        if (!dayTodos || dayTodos.length === 0) return null;

        const isOpen = !collapsedDays.has(key);
        const label = isToday(day)
          ? `Today · ${format(day, "MMM d")}`
          : format(day, "EEEE · MMM d");

        return (
          <Collapsible
            key={key}
            open={isOpen}
            onOpenChange={() => toggleDay(key)}
          >
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-1 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent/50 rounded transition-colors cursor-pointer">
              <motion.span
                animate={{ rotate: isOpen ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                className="flex items-center"
              >
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </motion.span>
              <span
                className={cn(
                  "font-semibold",
                  isToday(day)
                    ? "text-blue-500 dark:text-blue-400"
                    : "text-muted-foreground"
                )}
              >
                {label}
              </span>
              <span className="font-normal text-muted-foreground/60">
                ({dayTodos.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1 pt-1">
                <AnimatePresence mode="popLayout">
                  {dayTodos.map((todo) => (
                    <TodoItem
                      key={todo.id}
                      todo={todo}
                      allTodos={allTodos}
                      todoLabelsMap={todoLabelsMap}
                      commentCountsMap={commentCounts}
                    />
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
