import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

const push = vi.fn();
const setPaletteOpen = vi.fn();
const setTodoFormOpen = vi.fn();
const setEventFormOpen = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/command-store", () => ({
  useCommandStore: () => ({
    paletteOpen: true,
    setPaletteOpen,
    setTodoFormOpen,
    setEventFormOpen,
  }),
}));

vi.mock("@/features/todos/queries", () => ({
  useTodos: () => ({
    data: [
      {
        id: "todo-1",
        title: "Renew passports",
        description: "Family admin",
        assigned_to: "Andrew",
        section: null,
        project_id: null,
        is_completed: false,
        parent_id: null,
        priority: "high",
      },
    ],
  }),
}));

vi.mock("@/features/projects/queries", () => ({
  useProjects: () => ({
    data: [{ id: "project-1", name: "House", color: "#fff" }],
  }),
}));

vi.mock("@/features/grocery/queries", () => ({
  useGroceryItems: () => ({
    data: [
      { id: "grocery-1", name: "Milk", category: "Dairy", notes: null },
    ],
  }),
}));

vi.mock("@/features/services/queries", () => ({
  useServices: () => ({
    data: [
      {
        id: "service-1",
        name: "Dr. Smith",
        category: "Medical",
        notes: "Pediatrician",
        email: null,
        phone: null,
        is_favourite: true,
      },
    ],
  }),
}));

vi.mock("@/features/meals/queries", () => ({
  useMealPlans: () => ({
    data: [
      { id: "meal-1", title: "Pasta Night", notes: null, meal_type: "dinner" },
    ],
  }),
}));

vi.mock("@/features/calendar/queries", () => ({
  useFamilyEvents: () => ({
    data: [
      {
        id: "event-1",
        title: "School pickup",
        description: null,
        all_day: false,
        start_at: "2026-04-14T12:00:00.000Z",
      },
    ],
  }),
}));

vi.mock("@/components/ui/command", () => {
  const React = require("react");
  return {
    CommandDialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CommandEmpty: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CommandGroup: ({ heading, children }: { heading: string; children: React.ReactNode }) => (
      <section>
        <h2>{heading}</h2>
        {children}
      </section>
    ),
    CommandInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input aria-label="command-input" {...props} />,
    CommandList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    CommandSeparator: () => <hr />,
    CommandShortcut: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
    CommandItem: ({ children, onSelect }: { children: React.ReactNode; onSelect?: () => void }) => (
      <button type="button" onClick={onSelect}>
        {children}
      </button>
    ),
  };
});

import { CommandPalette } from "@/components/command-palette";

describe("CommandPalette", () => {
  beforeEach(() => {
    push.mockReset();
    setPaletteOpen.mockReset();
    setTodoFormOpen.mockReset();
    setEventFormOpen.mockReset();
  });

  it("shows search groups for multiple HQ features", () => {
    render(<CommandPalette />);

    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Grocery" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Meals" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Services" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Calendar" })).toBeInTheDocument();
  });

  it("navigates to the relevant feature when selecting a grocery result", () => {
    render(<CommandPalette />);

    fireEvent.click(screen.getByText("Milk"));

    expect(setPaletteOpen).toHaveBeenCalledWith(false);
    expect(push).toHaveBeenCalledWith("/grocery");
  });
});
