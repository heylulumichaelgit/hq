"use client";

import { create } from "zustand";
import type { Priority, Person } from "@/lib/supabase/types";

interface TodoFilters {
  assignedTo: Person | "all";
  priority: Priority | "all";
  completed: "all" | "completed" | "active";
  sortBy: "due_date" | "priority" | "created_at";
  sortOrder: "asc" | "desc";
  search: string;
  section: string | "all";
  labelId: string | null;
}

interface TodoFilterState {
  filters: TodoFilters;
  collapsedSections: Set<string>;
  setFilter: <K extends keyof TodoFilters>(key: K, value: TodoFilters[K]) => void;
  resetFilters: () => void;
  toggleSection: (section: string) => void;
}

const defaultFilters: TodoFilters = {
  assignedTo: "all",
  priority: "all",
  completed: "active",
  sortBy: "created_at",
  sortOrder: "desc",
  search: "",
  section: "all",
  labelId: null,
};

export const useTodoFilterStore = create<TodoFilterState>((set) => ({
  filters: defaultFilters,
  collapsedSections: new Set<string>(),
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: defaultFilters }),
  toggleSection: (section) =>
    set((state) => {
      const next = new Set(state.collapsedSections);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return { collapsedSections: next };
    }),
}));
