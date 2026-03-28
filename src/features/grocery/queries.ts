"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { GroceryItem, GroceryItemInsert, GroceryItemUpdate } from "@/lib/supabase/types";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

export const GROCERY_KEY = ["grocery_items"];

export function useGroceryItems() {
  useRealtimeSync({
    table: "grocery_items",
    queryKey: GROCERY_KEY,
    channelName: "grocery-realtime",
    userIdColumn: "added_by",
  });

  return useQuery<GroceryItem[]>({
    queryKey: GROCERY_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("grocery_items")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as GroceryItem[];
    },
  });
}

export function useAddGroceryItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: GroceryItemInsert[]) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("grocery_items")
        .insert(items)
        .select();
      if (error) throw error;
      return data as GroceryItem[];
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GROCERY_KEY });
      toast.success(`${data.length} item${data.length !== 1 ? "s" : ""} added`);
    },
    onError: () => toast.error("Failed to add items"),
  });
}

export function useToggleGroceryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_checked }: { id: string; is_checked: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("grocery_items")
        .update({ is_checked })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERY_KEY }),
    onError: () => toast.error("Failed to update item"),
  });
}

export function useUpdateGroceryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: GroceryItemUpdate & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("grocery_items")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERY_KEY }),
    onError: () => toast.error("Failed to update item"),
  });
}

export function useDeleteGroceryItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("grocery_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERY_KEY }),
    onError: () => toast.error("Failed to delete item"),
  });
}

export function useClearCheckedItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("grocery_items")
        .delete()
        .eq("is_checked", true);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROCERY_KEY });
      toast.success("Checked items cleared");
    },
    onError: () => toast.error("Failed to clear items"),
  });
}
