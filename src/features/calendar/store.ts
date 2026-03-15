import { create } from "zustand";
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
} from "date-fns";

interface CalendarViewState {
  currentDate: Date;
  weekStart: Date;
  weekEnd: Date;
  view: "week" | "schedule";
  setCurrentDate: (date: Date) => void;
  goToToday: () => void;
  goForward: () => void;
  goBack: () => void;
  setView: (view: "week" | "schedule") => void;
}

function weekBounds(date: Date) {
  return {
    weekStart: startOfWeek(date, { weekStartsOn: 1 }),
    weekEnd: endOfWeek(date, { weekStartsOn: 1 }),
  };
}

export const useCalendarStore = create<CalendarViewState>((set) => {
  const now = new Date();
  return {
    currentDate: now,
    ...weekBounds(now),
    view: "schedule",

    setCurrentDate: (date) => set({ currentDate: date, ...weekBounds(date) }),

    goToToday: () => {
      const today = new Date();
      set({ currentDate: today, ...weekBounds(today) });
    },

    goForward: () =>
      set((s) => {
        const next = addWeeks(s.currentDate, 1);
        return { currentDate: next, ...weekBounds(next) };
      }),

    goBack: () =>
      set((s) => {
        const prev = subWeeks(s.currentDate, 1);
        return { currentDate: prev, ...weekBounds(prev) };
      }),

    setView: (view) => set({ view }),
  };
});
