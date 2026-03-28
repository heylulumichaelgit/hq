"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/features/auth/store";

/**
 * Subscribe to Supabase Realtime postgres_changes on a table and
 * invalidate a React Query cache key when OTHER users make changes.
 *
 * Changes made by the current user are ignored to avoid double-updates
 * on top of optimistic mutations.
 */
export function useRealtimeSync({
  table,
  queryKey,
  channelName,
  userIdColumn,
}: {
  /** Postgres table name (e.g. "grocery_items") */
  table: string;
  /** React Query key to invalidate (e.g. ["grocery_items"]) */
  queryKey: readonly unknown[];
  /** Unique Supabase channel name (e.g. "grocery-realtime") */
  channelName: string;
  /** Column in the table that stores the user ID who made the change */
  userIdColumn: string;
}) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: { eventType: string; old: Record<string, unknown>; new: Record<string, unknown> }) => {
          // Determine who made the change from the payload
          const record =
            payload.eventType === "DELETE" ? payload.old : payload.new;
          const changedBy = record?.[userIdColumn];

          // Skip invalidation if the change was made by the current user —
          // our optimistic mutations already handle that.
          if (changedBy && userId && changedBy === userId) return;

          queryClient.invalidateQueries({ queryKey: [...queryKey] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, table, channelName, userIdColumn, userId, queryKey]);
}
