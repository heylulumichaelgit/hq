"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import type { GroceryItem, GroceryItemInsert, GroceryItemUpdate, GroceryStaple, GroceryStapleInsert } from "@/lib/supabase/types";
import { useRealtimeSync } from "@/hooks/use-realtime-sync";

export const GROCERY_KEY = ["grocery_items"];
export const GROCERY_STAPLES_KEY = ["grocery_staples"];

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

export function useGroceryStaples() {
  useRealtimeSync({
    table: "grocery_staples",
    queryKey: GROCERY_STAPLES_KEY,
    channelName: "grocery-staples-realtime",
    userIdColumn: "added_by",
  });

  return useQuery<GroceryStaple[]>({
    queryKey: GROCERY_STAPLES_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("grocery_staples")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as GroceryStaple[];
    },
  });
}

export function useCreateGroceryStaple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (staple: GroceryStapleInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("grocery_staples")
        .upsert(staple, { onConflict: "name,unit,notes" })
        .select()
        .single();
      if (error) throw error;
      return data as GroceryStaple;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROCERY_STAPLES_KEY });
      toast.success("Staple saved");
    },
    onError: () => toast.error("Failed to save staple"),
  });
}

export function useDeleteGroceryStaple() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("grocery_staples").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROCERY_STAPLES_KEY });
      toast.success("Staple removed");
    },
    onError: () => toast.error("Failed to remove staple"),
  });
}

export function useAddStaplesToGrocery() {
  const addItems = useAddGroceryItems();
  return useMutation({
    mutationFn: async ({ staples, addedBy }: { staples: GroceryStaple[]; addedBy?: string | null }) => {
      const basePosition = Math.floor(Date.now() / 1000);
      return addItems.mutateAsync(
        staples.map((staple, index) => ({
          name: staple.name,
          category: staple.category,
          quantity: staple.quantity,
          unit: staple.unit,
          notes: staple.notes,
          is_checked: false,
          added_by: addedBy ?? staple.added_by ?? null,
          position: basePosition + index,
        }))
      );
    },
    onSuccess: (_data, variables) => {
      toast.success(`${variables.staples.length} staple${variables.staples.length === 1 ? "" : "s"} added`);
    },
    onError: () => toast.error("Failed to add staples"),
  });
}
