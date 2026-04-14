"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Todo, TodoInsert, TodoUpdate } from "@/lib/supabase/types";
import { getNextDueDate } from "@/lib/recurrence";
import { toast } from "sonner";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";
import { useAuthStore } from "@/features/auth/store";

export const TODOS_KEY = ["todos"];

export function useTodos() {
  const user = useAuthStore((s) => s.user);
  const isAuthReady = useAuthStore((s) => s.isReady);
  const todoQueryKey = [...TODOS_KEY, user?.id ?? "anon"] as const;

  useRealtimeSync({
    table: "todos",
    queryKey: todoQueryKey,
    channelName: "todos-realtime",
    userIdColumn: "created_by",
  });

  return useQuery<Todo[]>({
    queryKey: todoQueryKey,
    enabled: isAuthReady && !!user,
    retry: 1,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient();

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        throw new Error("No active session");
      }

      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      return (data ?? []) as Todo[];
    },
  });
}

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (todo: TodoInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .insert(todo)
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const snapshots = queryClient.getQueriesData<Todo[]>({ queryKey: TODOS_KEY });
      const now = new Date().toISOString();
      const optimisticTodo: Todo = {
        id: `optimistic-${crypto.randomUUID()}`,
        title: todo.title,
        description: todo.description ?? null,
        due_date: todo.due_date ?? null,
        priority: todo.priority ?? "medium",
        assigned_to: todo.assigned_to ?? "Both",
        created_by: todo.created_by,
        is_completed: todo.is_completed ?? false,
        parent_id: todo.parent_id ?? null,
        project_id: todo.project_id ?? null,
        section: todo.section ?? null,
        position: todo.position ?? 0,
        recurrence_rule: todo.recurrence_rule ?? null,
        duration_minutes: todo.duration_minutes ?? null,
        completed_at: todo.completed_at ?? null,
        created_at: todo.created_at ?? now,
        updated_at: todo.updated_at ?? now,
      };

      for (const [key, existing] of snapshots) {
        queryClient.setQueryData<Todo[]>(key, [optimisticTodo, ...(existing ?? [])]);
      }

      return { snapshots };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
      toast.success("Task created");
    },
    onError: (_error, _todo, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Failed to create task");
    },
  });
}

export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: TodoUpdate & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todos")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const snapshots = queryClient.getQueriesData<Todo[]>({ queryKey: TODOS_KEY });

      for (const [key, existing] of snapshots) {
        queryClient.setQueryData<Todo[]>(
          key,
          (existing ?? []).map((todo) =>
            todo.id === id ? { ...todo, ...updates, updated_at: new Date().toISOString() } : todo
          )
        );
      }

      return { snapshots };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
    },
    onError: (_error, _updates, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Failed to update task");
    },
  });
}

export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("todos").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete task"),
  });
}

export function useToggleTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      is_completed,
      recurrence_rule,
      due_date,
    }: {
      id: string;
      is_completed: boolean;
      recurrence_rule?: string | null;
      due_date?: string | null;
    }) => {
      const supabase = createClient();

      // Recurring todo being completed: advance to next occurrence instead
      if (is_completed && recurrence_rule) {
        const nextDue = getNextDueDate(recurrence_rule, due_date ?? null);
        const { data, error } = await supabase
          .from("todos")
          .update({ is_completed: false, due_date: nextDue })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return data as Todo;
      }

      const { data, error } = await supabase
        .from("todos")
        .update({ is_completed })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Todo;
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: TODOS_KEY });
      const snapshots = queryClient.getQueriesData<Todo[]>({ queryKey: TODOS_KEY });

      const optimisticUpdates =
        variables.is_completed && variables.recurrence_rule
          ? {
              is_completed: false,
              due_date: getNextDueDate(variables.recurrence_rule, variables.due_date ?? null),
            }
          : { is_completed: variables.is_completed };

      for (const [key, existing] of snapshots) {
        queryClient.setQueryData<Todo[]>(
          key,
          (existing ?? []).map((todo) =>
            todo.id === variables.id
              ? {
                  ...todo,
                  ...optimisticUpdates,
                  updated_at: new Date().toISOString(),
                }
              : todo
          )
        );
      }

      return { snapshots };
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
      if (variables.is_completed) {
        if (variables.recurrence_rule) {
          toast.success("Task rescheduled to next occurrence");
        } else {
          toast.success("Task completed");
        }
      }
    },
    onError: (_error, _variables, context) => {
      context?.snapshots.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
      toast.error("Failed to update task");
    },
  });
}

/** Get unique section names for a given project (or Inbox if projectId is null) */
export function useSections(projectId?: string | null) {
  const { data: todos } = useTodos();

  const sections = Array.from(
    new Set(
      (todos ?? [])
        .filter((t) => {
          if (projectId === undefined) return true;
          return t.project_id === projectId;
        })
        .map((t) => t.section)
        .filter((s): s is string => !!s)
    )
  ).sort();

  return sections;
}

/** Get subtasks count summary for a parent todo */
export function getSubtaskProgress(
  todos: Todo[],
  parentId: string
): { total: number; completed: number } {
  const subtasks = todos.filter((t) => t.parent_id === parentId);
  return {
    total: subtasks.length,
    completed: subtasks.filter((t) => t.is_completed).length,
  };
}
