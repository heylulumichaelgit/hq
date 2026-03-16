"use client";

import { useTodos } from "@/features/todos/queries";
import { useProjects } from "@/features/projects/queries";
import { TodoItem } from "@/features/todos/components/todo-item";
import { useAllTodoLabels } from "@/features/labels/queries";
import { useCommentCounts } from "@/features/comments/queries";
import { motion, AnimatePresence } from "framer-motion";
import { isToday, isPast, startOfDay } from "date-fns";
import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/supabase/types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

export default function TodayPage() {
  const { data: todos, isLoading } = useTodos();
  const { data: projects = [] } = useProjects();
  const todoLabelsMap = useAllTodoLabels();
  const commentCounts = useCommentCounts();

  const { overdue, todayByProject, totalCount, doneCount, totalMinutes } = useMemo(() => {
    if (!todos) return { overdue: [], todayByProject: new Map(), totalCount: 0, doneCount: 0, totalMinutes: 0 };

    // Only top-level todos
    const topLevel = todos.filter((t) => !t.parent_id);

    const overdue: Todo[] = [];
    const todayTodos: Todo[] = [];

    for (const t of topLevel) {
      if (!t.due_date) continue;
      const d = startOfDay(new Date(t.due_date));
      if (isToday(d)) {
        todayTodos.push(t);
      } else if (isPast(d) && !t.is_completed) {
        overdue.push(t);
      }
    }

    // Group today's todos by project
    const byProject = new Map<string | null, Todo[]>();
    for (const t of todayTodos) {
      const key = t.project_id;
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(t);
    }

    const all = [...overdue, ...todayTodos];
    const totalMinutes = all
      .filter((t) => t.duration_minutes)
      .reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0);

    return {
      overdue,
      todayByProject: byProject,
      totalCount: all.length,
      doneCount: all.filter((t) => t.is_completed).length,
      totalMinutes,
    };
  }, [todos]);

  function formatDuration(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `~${m}m`;
    if (m === 0) return `~${h}h`;
    return `~${h}h ${m}m`;
  }

  const allTodos = todos ?? [];
  const allDone = totalCount > 0 && doneCount === totalCount;

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <Sun className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Today</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
        {totalCount > 0 && (
          <span className="text-sm text-muted-foreground">
            {doneCount}/{totalCount} done
            {totalMinutes > 0 && ` · ${formatDuration(totalMinutes)}`}
          </span>
        )}
      </div>

      {/* Family Zero state */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CheckCircle2 className="h-16 w-16 text-primary" />
            </motion.div>
            <p className="mt-4 text-xl font-bold">Family Zero! 🎉</p>
            <p className="mt-1 text-sm text-muted-foreground">
              All done for today. Enjoy the rest of your day!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!allDone && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sun className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            Nothing due today
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Enjoy your free day!
          </p>
        </div>
      )}

      {/* Overdue section */}
      {overdue.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:text-foreground/50">
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue
            <span className="font-normal opacity-60">({overdue.length})</span>
          </div>
          <AnimatePresence mode="popLayout">
            {overdue.map((todo) => (
              <TodoItem key={todo.id} todo={todo} allTodos={allTodos} todoLabelsMap={todoLabelsMap} commentCountsMap={commentCounts} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Today by project */}
      {Array.from(todayByProject.entries()).map(([projectId, projectTodos]) => {
        const project = projects.find((p) => p.id === projectId);
        const label = project?.name ?? "Inbox";
        const color = project?.color ?? "#8B8680";

        return (
          <Collapsible key={projectId ?? "inbox"} defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 rounded transition-colors cursor-pointer">
              <ChevronDown className="h-3.5 w-3.5" />
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              {label}
              <span className="font-normal">({projectTodos.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {(projectTodos as Todo[]).map((t) => (
                    <TodoItem key={t.id} todo={t} allTodos={allTodos} todoLabelsMap={todoLabelsMap} commentCountsMap={commentCounts} />
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
