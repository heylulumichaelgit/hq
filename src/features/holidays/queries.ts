"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface Holiday {
  id: string;
  title: string;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "planning" | "booked" | "completed" | "cancelled";
  notes: string | null;
  budget: number | null;
  currency: string;
  attendees: string | null;
  booking_ref: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type HolidayInsert = Omit<Holiday, "id" | "created_at" | "updated_at">;
export type HolidayUpdate = Partial<HolidayInsert>;

const HOLIDAYS_KEY = ["holidays"];

export function useHolidays() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("holidays-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "holidays" },
        () => {
          queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery<Holiday[]>({
    queryKey: HOLIDAYS_KEY,
    retry: 1,
    staleTime: 30_000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("holidays")
        .select("*")
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);
      return (data ?? []) as Holiday[];
    },
  });
}

export function useCreateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (holiday: HolidayInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("holidays")
        .insert(holiday)
        .select()
        .single();

      if (error) throw error;
      return data as Holiday;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY });
      toast.success("Trip added");
    },
    onError: () => toast.error("Failed to add trip"),
  });
}

export function useUpdateHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: HolidayUpdate & { id: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("holidays")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Holiday;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY });
    },
    onError: () => toast.error("Failed to update trip"),
  });
}

export function useDeleteHoliday() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("holidays").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: HOLIDAYS_KEY });
      toast.success("Trip removed");
    },
    onError: () => toast.error("Failed to remove trip"),
  });
}
