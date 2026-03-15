"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useMemo } from "react";
import type { TodoComment, TodoCommentInsert } from "@/lib/supabase/types";

const COMMENTS_KEY = (todoId: string) => ["comments", todoId];
const COMMENT_COUNTS_KEY = ["comment_counts"];

export type CommentWithProfile = TodoComment & {
  profiles: { display_name: string; avatar_url: string | null; email: string | null } | null;
};

export function useComments(todoId: string, enabled = true) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`comments-${todoId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "todo_comments", filter: `todo_id=eq.${todoId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: COMMENTS_KEY(todoId) });
          queryClient.invalidateQueries({ queryKey: COMMENT_COUNTS_KEY });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [todoId, enabled, queryClient]);

  return useQuery<CommentWithProfile[]>({
    queryKey: COMMENTS_KEY(todoId),
    enabled,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todo_comments")
        .select("*, profiles(display_name, avatar_url, email)")
        .eq("todo_id", todoId)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as CommentWithProfile[];
    },
  });
}

/** Returns a Map<todoId, count> for showing comment badges without N+1 */
export function useCommentCounts() {
  const { data = [] } = useQuery<{ todo_id: string }[]>({
    queryKey: COMMENT_COUNTS_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todo_comments")
        .select("todo_id");
      if (error) throw new Error(error.message);
      return (data ?? []) as { todo_id: string }[];
    },
  });

  return useMemo(() => {
    const map = new Map<string, number>();
    for (const row of data) {
      map.set(row.todo_id, (map.get(row.todo_id) ?? 0) + 1);
    }
    return map;
  }, [data]);
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (comment: TodoCommentInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("todo_comments")
        .insert(comment)
        .select("*, profiles(display_name, avatar_url, email)")
        .single();
      if (error) throw error;
      return data as CommentWithProfile;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: COMMENTS_KEY(data.todo_id) });
      queryClient.invalidateQueries({ queryKey: COMMENT_COUNTS_KEY });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, todoId }: { id: string; todoId: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("todo_comments").delete().eq("id", id);
      if (error) throw error;
      return todoId;
    },
    onSuccess: (todoId) => {
      queryClient.invalidateQueries({ queryKey: COMMENTS_KEY(todoId) });
      queryClient.invalidateQueries({ queryKey: COMMENT_COUNTS_KEY });
    },
  });
}
