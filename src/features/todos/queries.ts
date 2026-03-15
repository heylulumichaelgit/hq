"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import type { Todo, TodoInsert, TodoUpdate } from "@/lib/supabase/types";
import { getNextDueDate } from "@/lib/recurrence";

const TODOS_KEY = ["todos"];
const QUERY_TIMEOUT_MS = 10_000;

function forceLogout() {
  document.cookie.split(";").forEach((c) => {
    const name = c.trim().split("=")[0];
    if (name.startsWith("sb-")) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
  const supabase = createClient();
  supabase.auth.signOut().catch(() => {});
  window.location.href = "/login";
}

function isAuthError(error: unknown): boolean {
  const msg =
    error instanceof Error ? error.message.toLowerCase() : String(error);
  return (
    msg.includes("jwt") ||
    msg.includes("token") ||
    msg.includes("auth") ||
    msg.includes("refresh_token") ||
    msg.includes("timed out")
  );
}

export function useTodos() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("todos-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "todos" },
        () => {
          queryClient.invalidateQueries({ queryKey: TODOS_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery<Todo[]>({
    queryKey: TODOS_KEY,
    queryFn: async () => {
      const supabase = createClient();

      const query = supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Query timed out")), QUERY_TIMEOUT_MS)
      );

      let result: { data: Todo[] | null; error: { message: string } | null };
      try {
        result = (await Promise.race([query, timeout])) as typeof result;
      } catch (err) {
        if (isAuthError(err)) forceLogout();
        throw err;
      }

      if (result.error) {
        if (isAuthError(result.error)) forceLogout();
        throw new Error(result.error.message);
      }
      return (result.data ?? []) as Todo[];
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
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
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_KEY });
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
