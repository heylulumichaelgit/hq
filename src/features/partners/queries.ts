"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { toast } from "sonner";

export interface ServicePartner {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  notes: string | null;
  is_favourite: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ServicePartnerInsert = Omit<ServicePartner, "id" | "created_at" | "updated_at">;
export type ServicePartnerUpdate = Partial<Omit<ServicePartner, "id" | "created_at" | "updated_at">>;

export const PARTNERS_KEY = ["service_partners"];

export const PARTNER_CATEGORIES = [
  "Plumbing",
  "Electrical",
  "Painting",
  "Cleaning",
  "Medical",
  "Dental",
  "Automotive",
  "Legal",
  "Financial",
  "School",
  "Other",
] as const;

export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export function usePartners() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("partners-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_partners" },
        () => {
          queryClient.invalidateQueries({ queryKey: PARTNERS_KEY });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery<ServicePartner[]>({
    queryKey: PARTNERS_KEY,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("service_partners")
        .select("*")
        .order("is_favourite", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as ServicePartner[];
    },
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (partner: ServicePartnerInsert) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("service_partners")
        .insert(partner)
        .select()
        .single();
      if (error) throw error;
      return data as ServicePartner;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_KEY });
      toast.success("Partner added");
    },
    onError: () => toast.error("Failed to add partner"),
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: ServicePartnerUpdate & { id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("service_partners")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PARTNERS_KEY }),
    onError: () => toast.error("Failed to update partner"),
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("service_partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PARTNERS_KEY });
      toast.success("Partner removed");
    },
    onError: () => toast.error("Failed to delete partner"),
  });
}

export function useToggleFavourite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_favourite }: { id: string; is_favourite: boolean }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("service_partners")
        .update({ is_favourite, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PARTNERS_KEY }),
    onError: () => toast.error("Failed to update favourite"),
  });
}
