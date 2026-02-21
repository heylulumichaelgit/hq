"use client";

import { useTodos } from "../queries";
import { useTodoFilterStore } from "../store";
import { TodoItem } from "./todo-item";
import type { Todo } from "@/lib/supabase/types";
import { AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2 } from "lucide-react";
import { useMemo } from "react";

const priorityOrder = { high: 3, medium: 2, low: 1 };

export function TodoList() {
  const { data: todos, isLoading, error } = useTodos();
  const { filters } = useTodoFilterStore();

  const filteredAndSorted = useMemo(() => {
    if (!todos) return [];

    let result = [...todos];

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

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (filters.sortBy) {
        case "due_date": {
          const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
          comparison = aDate - bDate;
          break;
        }
        case "priority":
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "created_at":
          comparison =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
      }
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [todos, filters]);

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

  if (filteredAndSorted.length === 0) {
    return (
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
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence mode="popLayout">
        {filteredAndSorted.map((todo) => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </AnimatePresence>
      <p className="text-xs text-muted-foreground pt-2">
        {filteredAndSorted.length} of {todos?.length ?? 0} todos
      </p>
    </div>
  );
}
