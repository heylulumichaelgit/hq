import { describe, it, expect } from "vitest";
import type { GroceryItem, Todo } from "@/lib/supabase/types";

function applyTodoToggleOptimisticUpdate(
  todos: Todo[],
  variables: { id: string; is_completed: boolean; recurrence_rule?: string | null; due_date?: string | null },
  nextDueDate: string
) {
  const optimisticUpdates =
    variables.is_completed && variables.recurrence_rule
      ? {
          is_completed: false,
          due_date: nextDueDate,
        }
      : { is_completed: variables.is_completed };

  return todos.map((todo) =>
    todo.id === variables.id
      ? {
          ...todo,
          ...optimisticUpdates,
          updated_at: "2026-04-14T09:35:00.000Z",
        }
      : todo
  );
}

function applyCheckedFilter(items: GroceryItem[]) {
  return items.filter((item) => !item.is_checked);
}

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: overrides.id ?? "todo-1",
    title: overrides.title ?? "Task",
    description: overrides.description ?? null,
    due_date: overrides.due_date ?? null,
    priority: overrides.priority ?? "medium",
    assigned_to: overrides.assigned_to ?? "Lulu",
    created_by: overrides.created_by ?? "user-1",
    is_completed: overrides.is_completed ?? false,
    parent_id: overrides.parent_id ?? null,
    project_id: overrides.project_id ?? null,
    section: overrides.section ?? null,
    position: overrides.position ?? 0,
    recurrence_rule: overrides.recurrence_rule ?? null,
    duration_minutes: overrides.duration_minutes ?? null,
    completed_at: overrides.completed_at ?? null,
    created_at: overrides.created_at ?? "2026-04-14T09:00:00.000Z",
    updated_at: overrides.updated_at ?? "2026-04-14T09:00:00.000Z",
  };
}

function makeGroceryItem(overrides: Partial<GroceryItem> = {}): GroceryItem {
  return {
    id: overrides.id ?? "item-1",
    name: overrides.name ?? "Milk",
    quantity: overrides.quantity ?? null,
    category: overrides.category ?? "Dairy",
    unit: overrides.unit ?? null,
    is_checked: overrides.is_checked ?? false,
    added_by: overrides.added_by ?? "user-1",
    position: overrides.position ?? 0,
    notes: overrides.notes ?? null,
    created_at: overrides.created_at ?? "2026-04-14T09:00:00.000Z",
  };
}

describe("optimistic cache updates", () => {
  it("reschedules recurring todos immediately instead of hiding them as completed", () => {
    const todos = [
      makeTodo({ id: "recurring", due_date: "2026-04-14", recurrence_rule: "daily" }),
      makeTodo({ id: "other", title: "Other task" }),
    ];

    const updated = applyTodoToggleOptimisticUpdate(
      todos,
      {
        id: "recurring",
        is_completed: true,
        recurrence_rule: "daily",
        due_date: "2026-04-14",
      },
      "2026-04-15"
    );

    expect(updated[0].is_completed).toBe(false);
    expect(updated[0].due_date).toBe("2026-04-15");
    expect(updated[1]).toEqual(todos[1]);
  });

  it("removes checked grocery items from the optimistic clear action", () => {
    const items = [
      makeGroceryItem({ id: "1", is_checked: true, name: "Milk" }),
      makeGroceryItem({ id: "2", is_checked: false, name: "Eggs" }),
      makeGroceryItem({ id: "3", is_checked: true, name: "Bread" }),
    ];

    const updated = applyCheckedFilter(items);

    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe("Eggs");
  });
});
