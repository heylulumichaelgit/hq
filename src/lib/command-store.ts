import { create } from "zustand";

interface CommandStore {
  paletteOpen: boolean;
  todoFormOpen: boolean;
  eventFormOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  setTodoFormOpen: (open: boolean) => void;
  setEventFormOpen: (open: boolean) => void;
}

export const useCommandStore = create<CommandStore>((set) => ({
  paletteOpen: false,
  todoFormOpen: false,
  eventFormOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  setTodoFormOpen: (open) => set({ todoFormOpen: open }),
  setEventFormOpen: (open) => set({ eventFormOpen: open }),
}));
