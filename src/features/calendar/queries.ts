"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GoogleCalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  calendarId: string;
  calendarName: string;
  color: string | null;
  userId: string;
  userDisplayName: string;
  userColor: string;
  source: "google";
}

export interface FamilyEvent {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  all_day: boolean;
  created_by: string;
  gcal_event_ids: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface ConnectionStatus {
  connected: boolean;
  googleEmail: string | null;
}

export interface CalendarSelection {
  id: string;
  user_id: string;
  calendar_id: string;
  calendar_name: string;
  show_in_family_view: boolean;
  is_work_calendar: boolean;
  color: string | null;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function useConnectionStatus() {
  return useQuery<ConnectionStatus>({
    queryKey: ["calendar-status"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/status");
      if (!res.ok) throw new Error("Failed to fetch connection status");
      return res.json();
    },
    staleTime: 30_000,
  });
}

export function useGoogleCalendarEvents(timeMin: string, timeMax: string) {
  return useQuery<GoogleCalendarEvent[]>({
    queryKey: ["calendar-events", timeMin, timeMax],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar/events?start=${encodeURIComponent(timeMin)}&end=${encodeURIComponent(timeMax)}`
      );
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      const json = await res.json();
      return json.events ?? [];
    },
    staleTime: 5 * 60_000, // 5 minutes
  });
}

export function useFamilyEvents(timeMin: string, timeMax: string) {
  return useQuery<FamilyEvent[]>({
    queryKey: ["family-events", timeMin, timeMax],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar/family-events?start=${encodeURIComponent(timeMin)}&end=${encodeURIComponent(timeMax)}`
      );
      if (!res.ok) throw new Error("Failed to fetch family events");
      const json = await res.json();
      return json.events ?? [];
    },
  });
}

export function useCalendarSelections() {
  return useQuery<CalendarSelection[]>({
    queryKey: ["calendar-selections"],
    queryFn: async () => {
      const res = await fetch("/api/calendar/selections");
      if (!res.ok) throw new Error("Failed to fetch selections");
      const json = await res.json();
      return json.selections ?? [];
    },
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateSelection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      calendar_id: string;
      show_in_family_view?: boolean;
      is_work_calendar?: boolean;
    }) => {
      const res = await fetch("/api/calendar/selections", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update selection");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-selections"] });
    },
  });
}

export function useCreateFamilyEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      title: string;
      description?: string;
      start_at: string;
      end_at: string;
      all_day?: boolean;
      create_busy_events?: boolean;
    }) => {
      const res = await fetch("/api/calendar/family-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to create event");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-events"] });
    },
  });
}

export function useDeleteFamilyEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/calendar/family-events/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete event");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-events"] });
    },
  });
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/calendar/oauth/disconnect", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-status"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-selections"] });
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
    },
  });
}
