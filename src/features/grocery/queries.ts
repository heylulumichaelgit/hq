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
    onMutate: async (items) => {
      await queryClient.cancelQueries({ queryKey: GROCERY_KEY });
      const previousItems = queryClient.getQueryData<GroceryItem[]>(GROCERY_KEY) ?? [];
      const now = new Date().toISOString();
      const optimisticItems: GroceryItem[] = items.map((item) => ({
        id: `optimistic-${crypto.randomUUID()}`,
        name: item.name,
        quantity: item.quantity ?? null,
        category: item.category ?? "Other",
        unit: item.unit ?? null,
        is_checked: item.is_checked ?? false,
        added_by: item.added_by ?? null,
        position: item.position ?? 0,
        notes: item.notes ?? null,
        created_at: item.created_at ?? now,
      }));

      queryClient.setQueryData<GroceryItem[]>(GROCERY_KEY, [...previousItems, ...optimisticItems]);

      return { previousItems };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: GROCERY_KEY });
      toast.success(`${data.length} item${data.length !== 1 ? "s" : ""} added`);
    },
    onError: (_error, _items, context) => {
      queryClient.setQueryData(GROCERY_KEY, context?.previousItems ?? []);
      toast.error("Failed to add items");
    },
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
    onMutate: async ({ id, is_checked }) => {
      await queryClient.cancelQueries({ queryKey: GROCERY_KEY });
      const previousItems = queryClient.getQueryData<GroceryItem[]>(GROCERY_KEY) ?? [];
      queryClient.setQueryData<GroceryItem[]>(
        GROCERY_KEY,
        previousItems.map((item) =>
          item.id === id
            ? { ...item, is_checked, updated_at: new Date().toISOString() }
            : item
        )
      );
      return { previousItems };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERY_KEY }),
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(GROCERY_KEY, context?.previousItems ?? []);
      toast.error("Failed to update item");
    },
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
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: GROCERY_KEY });
      const previousItems = queryClient.getQueryData<GroceryItem[]>(GROCERY_KEY) ?? [];
      queryClient.setQueryData<GroceryItem[]>(
        GROCERY_KEY,
        previousItems.map((item) =>
          item.id === id
            ? { ...item, ...updates, updated_at: new Date().toISOString() }
            : item
        )
      );
      return { previousItems };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERY_KEY }),
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(GROCERY_KEY, context?.previousItems ?? []);
      toast.error("Failed to update item");
    },
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
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: GROCERY_KEY });
      const previousItems = queryClient.getQueryData<GroceryItem[]>(GROCERY_KEY) ?? [];
      queryClient.setQueryData<GroceryItem[]>(
        GROCERY_KEY,
        previousItems.filter((item) => item.id !== id)
      );
      return { previousItems };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROCERY_KEY }),
    onError: (_error, _id, context) => {
      queryClient.setQueryData(GROCERY_KEY, context?.previousItems ?? []);
      toast.error("Failed to delete item");
    },
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
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: GROCERY_KEY });
      const previousItems = queryClient.getQueryData<GroceryItem[]>(GROCERY_KEY) ?? [];
      queryClient.setQueryData<GroceryItem[]>(
        GROCERY_KEY,
        previousItems.filter((item) => !item.is_checked)
      );
      return { previousItems };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROCERY_KEY });
      toast.success("Checked items cleared");
    },
    onError: (_error, _vars, context) => {
      queryClient.setQueryData(GROCERY_KEY, context?.previousItems ?? []);
      toast.error("Failed to clear items");
    },
  });
}
