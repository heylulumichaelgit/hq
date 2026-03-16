"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";
import type { Label, LabelInsert } from "@/lib/supabase/types";

export const LABELS_KEY = ["labels"];
export const TODO_LABELS_KEY = ["todo_labels"];

export function useLabels() {
  return useQuery<Label[]>({
    queryKey: LABELS_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .order("name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Label[];
    },
  });
}

export function useCreateLabel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (label: LabelInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("labels")
        .insert(label)
        .select()
        .single();
      if (error) throw error;
      return data as Label;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LABELS_KEY }),
  });
}

/** Returns a Map<todoId, Label[]> for efficient lookup */
export function useAllTodoLabels() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("todo_labels-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "todo_labels" }, () => {
        queryClient.invalidateQueries({ queryKey: TODO_LABELS_KEY });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: rows = [] } = useQuery<{ todo_id: string; labels: Label }[]>({
    queryKey: TODO_LABELS_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todo_labels")
        .select("todo_id, labels(id, name, color, created_at)");
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as { todo_id: string; labels: Label }[];
    },
  });

  return useMemo(() => {
    const map = new Map<string, Label[]>();
    for (const row of rows) {
      if (!row.labels) continue;
      if (!map.has(row.todo_id)) map.set(row.todo_id, []);
      map.get(row.todo_id)!.push(row.labels);
    }
    return map;
  }, [rows]);
}

export function useAddLabelToTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ todoId, labelId }: { todoId: string; labelId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("todo_labels")
        .insert({ todo_id: todoId, label_id: labelId });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TODO_LABELS_KEY }),
  });
}

export function useRemoveLabelFromTodo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ todoId, labelId }: { todoId: string; labelId: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("todo_labels")
        .delete()
        .eq("todo_id", todoId)
        .eq("label_id", labelId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TODO_LABELS_KEY }),
  });
}

export function useSyncTodoLabels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ todoId, labelIds }: { todoId: string; labelIds: string[] }) => {
      const supabase = createClient();
      // Delete all existing, then insert new
      const { error: deleteError } = await supabase.from("todo_labels").delete().eq("todo_id", todoId);
      if (deleteError) throw deleteError;
      if (labelIds.length > 0) {
        const { error } = await supabase
          .from("todo_labels")
          .insert(labelIds.map((id) => ({ todo_id: todoId, label_id: id })));
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: TODO_LABELS_KEY }),
  });
}
