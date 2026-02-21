"use client";

import { create } from "zustand";
import type { Priority, AssignedTo } from "@/lib/supabase/types";

interface TodoFilters {
  assignedTo: AssignedTo | "all";
  priority: Priority | "all";
  completed: "all" | "completed" | "active";
  sortBy: "due_date" | "priority" | "created_at";
  sortOrder: "asc" | "desc";
}

interface TodoFilterState {
  filters: TodoFilters;
  setFilter: <K extends keyof TodoFilters>(key: K, value: TodoFilters[K]) => void;
  resetFilters: () => void;
}

const defaultFilters: TodoFilters = {
  assignedTo: "all",
  priority: "all",
  completed: "active",
  sortBy: "created_at",
  sortOrder: "desc",
};

export const useTodoFilterStore = create<TodoFilterState>((set) => ({
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),
  resetFilters: () => set({ filters: defaultFilters }),
}));
