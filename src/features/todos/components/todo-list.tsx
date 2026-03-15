"use client";

import { useTodos } from "../queries";
import { useTodoFilterStore } from "../store";
import { TodoItem } from "./todo-item";
import { InlineQuickAdd } from "./inline-quick-add";
import type { Todo } from "@/lib/supabase/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  CheckCircle2,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import { useMemo } from "react";
import { isPast, isToday, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import { useAllTodoLabels } from "@/features/labels/queries";
import { useCommentCounts } from "@/features/comments/queries";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const priorityOrder = { high: 3, medium: 2, low: 1 };

function SectionHeader({
  title,
  count,
  isCollapsed,
  onToggle,
  variant = "default",
}: {
  title: string;
  count: number;
  isCollapsed: boolean;
  onToggle: () => void;
  variant?: "default" | "overdue";
}) {
  return (
    <CollapsibleTrigger
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-2 px-1 py-2 text-xs font-semibold uppercase tracking-wider",
        "hover:bg-accent/50 rounded transition-colors cursor-pointer",
        variant === "overdue"
          ? "text-destructive"
          : "text-muted-foreground"
      )}
    >
      <motion.div
        animate={{ rotate: isCollapsed ? -90 : 0 }}
        transition={{ duration: 0.15 }}
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </motion.div>
      {variant === "overdue" && <AlertTriangle className="h-3.5 w-3.5" />}
      <span>{title}</span>
      <span className="text-muted-foreground font-normal">({count})</span>
    </CollapsibleTrigger>
  );
}

interface TodoListProps {
  projectId?: string | null;
}

export function TodoList({ projectId }: TodoListProps) {
  const { data: todos, isLoading, error } = useTodos();
  const { filters, collapsedSections, toggleSection } = useTodoFilterStore();
  const todoLabelsMap = useAllTodoLabels();
  const commentCounts = useCommentCounts();

  const { overdueTodos, sectionedTodos, totalFiltered } = useMemo(() => {
    if (!todos) return { overdueTodos: [], sectionedTodos: new Map<string, Todo[]>(), totalFiltered: 0 };

    // Only show top-level todos (subtasks rendered within parent)
    // Scope to project: null = Inbox (no project), string = specific project, undefined = all
    let result = todos.filter((t) => {
      if (t.parent_id) return false; // skip subtasks
      if (projectId !== undefined) {
        return t.project_id === projectId;
      }
      return true;
    });

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const matchingIds = new Set<string>();

      // Search through all todos (including subtasks) for matches
      for (const t of todos) {
        if (
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q)
        ) {
          matchingIds.add(t.parent_id ?? t.id);
        }
      }
      result = result.filter((t) => matchingIds.has(t.id));
    }

    // Filter by assigned_to
    if (filters.assignedTo !== "all") {
      result = result.filter((t) => t.assigned_to === filters.assignedTo);
    }

    // Filter by priority
    if (filters.priority !== "all") {
      result = result.filter((t) => t.priority === filters.priority);
    }

    // Filter by completed status
    if (filters.completed === "active") {
      result = result.filter((t) => !t.is_completed);
    } else if (filters.completed === "completed") {
      result = result.filter((t) => t.is_completed);
    }

    // Filter by label
    if (filters.labelId) {
      result = result.filter((t) => {
        const labels = todoLabelsMap.get(t.id) ?? [];
        return labels.some((l) => l.id === filters.labelId);
      });
    }

    // Filter by section
    if (filters.section !== "all") {
      result = result.filter(
        (t) => (t.section ?? "") === (filters.section === "" ? "" : filters.section)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case "due_date": {
          const aDate = a.due_date
            ? new Date(a.due_date).getTime()
            : Infinity;
          const bDate = b.due_date
            ? new Date(b.due_date).getTime()
            : Infinity;
          comparison = aDate - bDate;
          break;
        }
        case "priority":
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "created_at":
          comparison =
            new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime();
          break;
      }
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

    const totalFiltered = result.length;

    // Separate overdue todos
    const overdue: Todo[] = [];
    const nonOverdue: Todo[] = [];

    for (const t of result) {
      if (
        t.due_date &&
        !t.is_completed &&
        isPast(startOfDay(new Date(t.due_date))) &&
        !isToday(new Date(t.due_date))
      ) {
        overdue.push(t);
      } else {
        nonOverdue.push(t);
      }
    }

    // Group non-overdue todos by section
    const grouped = new Map<string, Todo[]>();
    for (const t of nonOverdue) {
      const section = t.section || "";
      if (!grouped.has(section)) grouped.set(section, []);
      grouped.get(section)!.push(t);
    }

    return {
      overdueTodos: overdue,
      sectionedTodos: grouped,
      totalFiltered,
    };
  }, [todos, filters, todoLabelsMap]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 p-6 text-center">
        <p className="text-destructive">Failed to load todos</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  if (totalFiltered === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            {todos?.length === 0
              ? "No todos yet"
              : "No todos match your filters"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {todos?.length === 0
              ? "Create your first todo to get started!"
              : "Try adjusting your filters."}
          </p>
        </div>
        <InlineQuickAdd projectId={projectId} />
      </div>
    );
  }

  const allTodos = todos ?? [];
  const sections = Array.from(sectionedTodos.keys()).sort((a, b) => {
    // Unsectioned ("") goes last
    if (!a) return 1;
    if (!b) return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-1">
      {/* Overdue section */}
      {overdueTodos.length > 0 && (
        <Collapsible open={!collapsedSections.has("__overdue__")}>
          <SectionHeader
            title="Overdue"
            count={overdueTodos.length}
            isCollapsed={collapsedSections.has("__overdue__")}
            onToggle={() => toggleSection("__overdue__")}
            variant="overdue"
          />
          <CollapsibleContent>
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {overdueTodos.map((todo) => (
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
      )}

      {/* Sectioned todos */}
      {sections.map((section) => {
        const sectionTodos = sectionedTodos.get(section)!;
        const sectionKey = section || "__unsectioned__";
        const isCollapsed = collapsedSections.has(sectionKey);

        // If only unsectioned and no other sections, skip header
        if (!section && sections.length === 1 && overdueTodos.length === 0) {
          return (
            <div key={sectionKey} className="space-y-1">
              <AnimatePresence mode="popLayout">
                {sectionTodos.map((todo) => (
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
          );
        }

        return (
          <Collapsible key={sectionKey} open={!isCollapsed}>
            <SectionHeader
              title={section || "Unsectioned"}
              count={sectionTodos.length}
              isCollapsed={isCollapsed}
              onToggle={() => toggleSection(sectionKey)}
            />
            <CollapsibleContent>
              <div className="space-y-1">
                <AnimatePresence mode="popLayout">
                  {sectionTodos.map((todo) => (
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

      {/* Inline quick add */}
      <div className="pt-2">
        <InlineQuickAdd projectId={projectId} />
      </div>

      <p className="text-xs text-muted-foreground pt-2">
        {totalFiltered} of {todos?.length ?? 0} todos
      </p>
    </div>
  );
}
