"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface MealPlan {
  id: string;
  week_start: string;
  day_of_week: number;
  meal_type: string;
  title: string;
  notes: string | null;
  recipe_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export const MEAL_PLANS_KEY = (weekStart: string) => ["meal_plans", weekStart];

export function useMealPlans(weekStart: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("meal-plans-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meal_plans" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["meal_plans"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery<MealPlan[]>({
    queryKey: MEAL_PLANS_KEY(weekStart),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("week_start", weekStart)
        .order("day_of_week", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as MealPlan[];
    },
    enabled: !!weekStart,
  });
}

export interface UpsertMealPayload {
  week_start: string;
  day_of_week: number;
  meal_type: string;
  title: string;
  notes?: string | null;
  recipe_url?: string | null;
  created_by?: string | null;
}

export function useUpsertMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: UpsertMealPayload) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("meal_plans")
        .upsert(
          {
            week_start: payload.week_start,
            day_of_week: payload.day_of_week,
            meal_type: payload.meal_type,
            title: payload.title,
            notes: payload.notes ?? null,
            recipe_url: payload.recipe_url ?? null,
            created_by: payload.created_by ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "week_start,day_of_week,meal_type" }
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data as MealPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal_plans"] });
      toast.success("Meal planned");
    },
    onError: () => toast.error("Failed to save meal"),
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("meal_plans").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meal_plans"] });
    },
    onError: () => toast.error("Failed to delete meal"),
  });
}
