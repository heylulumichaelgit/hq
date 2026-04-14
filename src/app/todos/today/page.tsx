"use client";

import { useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isPast, isToday, startOfDay } from "date-fns";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Sun } from "lucide-react";
import type { Todo } from "@/lib/supabase/types";
import { useTodos } from "@/features/todos/queries";
import { useProjects } from "@/features/projects/queries";
import { TodoItem } from "@/features/todos/components/todo-item";
import { useAllTodoLabels } from "@/features/labels/queries";
import { useCommentCounts } from "@/features/comments/queries";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { useCommandStore } from "@/lib/command-store";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (mins <= 0) return "No estimate";
  if (h === 0) return `~${m}m`;
  if (m === 0) return `~${h}h`;
  return `~${h}h ${m}m`;
}

function SummaryCard({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "warning" }) {
  return (
    <Card className={tone === "warning" ? "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20" : undefined}>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function TodayPage() {
  const { data: todos, isLoading } = useTodos();
  const { data: projects = [] } = useProjects();
  const todoLabelsMap = useAllTodoLabels();
  const commentCounts = useCommentCounts();
  const { setSlot } = useHeaderSlot();
  const { setTodoFormOpen } = useCommandStore();

  const { overdue, todayByProject, totalCount, doneCount, totalMinutes, overdueCount, todayCount } = useMemo(() => {
    if (!todos) {
      return {
        overdue: [] as Todo[],
        todayByProject: new Map<string | null, Todo[]>(),
        totalCount: 0,
        doneCount: 0,
        totalMinutes: 0,
        overdueCount: 0,
        todayCount: 0,
      };
    }

    const topLevel = todos.filter((t) => !t.parent_id);
    const overdue: Todo[] = [];
    const todayTodos: Todo[] = [];

    for (const t of topLevel) {
      if (!t.due_date || t.is_completed) continue;
      const d = startOfDay(new Date(t.due_date));
      if (isToday(d)) {
        todayTodos.push(t);
      } else if (isPast(d)) {
        overdue.push(t);
      }
    }

    const byProject = new Map<string | null, Todo[]>();
    for (const t of todayTodos) {
      const key = t.project_id;
      if (!byProject.has(key)) byProject.set(key, []);
      byProject.get(key)!.push(t);
    }

    const all = [...overdue, ...todayTodos];
    const totalMinutes = all.reduce((sum, t) => sum + (t.duration_minutes ?? 0), 0);

    return {
      overdue,
      todayByProject: byProject,
      totalCount: all.length,
      doneCount: all.filter((t) => t.is_completed).length,
      totalMinutes,
      overdueCount: overdue.length,
      todayCount: todayTodos.length,
    };
  }, [todos]);

  useEffect(() => {
    setSlot(
      <>
        <span className="text-sm font-semibold shrink-0">Today</span>
        <span className="text-xs text-muted-foreground shrink-0">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => setTodoFormOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add task</span>
        </button>
      </>
    );
    return () => setSlot(null);
  }, [setSlot, setTodoFormOpen]);

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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryCard label="Overdue" value={String(overdueCount)} tone={overdueCount > 0 ? "warning" : "default"} />
        <SummaryCard label="Due today" value={String(todayCount)} />
        <SummaryCard label="Estimated time" value={formatDuration(totalMinutes)} />
      </div>

      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <CheckCircle2 className="h-14 w-14 text-primary" />
            <p className="mt-4 text-xl font-bold">Today is clear</p>
            <p className="mt-1 text-sm text-muted-foreground">Nothing urgent left hanging. Nice.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!allDone && totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Sun className="h-12 w-12 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">Nothing due today</p>
          <p className="mt-1 text-sm text-muted-foreground">A suspiciously calm day. Enjoy it.</p>
        </div>
      )}

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

      {Array.from(todayByProject.entries()).map(([projectId, projectTodos]) => {
        const project = projects.find((p) => p.id === projectId);
        const label = project?.name ?? "Inbox";
        const color = project?.color ?? "#8B8680";

        return (
          <Collapsible key={projectId ?? "inbox"} defaultOpen>
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 rounded transition-colors cursor-pointer">
              <ChevronDown className="h-3.5 w-3.5" />
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
              {label}
              <span className="font-normal">({projectTodos.length})</span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {projectTodos.map((t) => (
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
