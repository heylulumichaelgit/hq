/**
 * Pure-logic tests for the filtering and sorting rules used in TodoList.
 * No Supabase, no React — just data transformations.
 */
import { describe, it, expect } from "vitest";
import type { Todo } from "@/lib/supabase/types";
import type { Label } from "@/lib/supabase/types";

// ─── Shared priority helper (mirrors todo-list.tsx) ──────────────────────────
const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };

// ─── Factory helper ───────────────────────────────────────────────────────────
let _seq = 0;
function makeTodo(overrides: Partial<Todo> = {}): Todo {
  const id = overrides.id ?? `todo-${++_seq}`;
  return {
    id,
    title: overrides.title ?? `Task ${id}`,
    description: overrides.description ?? null,
    due_date: overrides.due_date ?? null,
    priority: overrides.priority ?? "medium",
    assigned_to: overrides.assigned_to ?? "Both",
    created_by: overrides.created_by ?? "user-1",
    is_completed: overrides.is_completed ?? false,
    parent_id: overrides.parent_id ?? null,
    project_id: overrides.project_id ?? null,
    section: overrides.section ?? null,
    position: overrides.position ?? 0,
    recurrence_rule: overrides.recurrence_rule ?? null,
    duration_minutes: overrides.duration_minutes ?? null,
    completed_at: overrides.completed_at ?? null,
    created_at: overrides.created_at ?? "2025-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2025-01-01T00:00:00Z",
  };
}

// ─── Filter: assigned_to ──────────────────────────────────────────────────────

describe("filter by assigned_to", () => {
  const todos = [
    makeTodo({ id: "a1", title: "Andrew task 1", assigned_to: "Andrew" }),
    makeTodo({ id: "a2", title: "Andrew task 2", assigned_to: "Andrew" }),
    makeTodo({ id: "c1", title: "Chrystalla task", assigned_to: "Chrystalla" }),
    makeTodo({ id: "b1", title: "Both task", assigned_to: "Both" }),
    makeTodo({ id: "l1", title: "Lulu task", assigned_to: "Lulu" }),
  ];

  const filterByAssignee = (all: Todo[], person: string) =>
    all.filter((t) => t.assigned_to === person);

  it("returns only Andrew's todos", () => {
    const result = filterByAssignee(todos, "Andrew");
    expect(result).toHaveLength(2);
    expect(result.every((t) => t.assigned_to === "Andrew")).toBe(true);
  });

  it("returns only Chrystalla's todos", () => {
    const result = filterByAssignee(todos, "Chrystalla");
    expect(result).toHaveLength(1);
    expect(result[0].assigned_to).toBe("Chrystalla");
  });

  it("returns only Both todos", () => {
    const result = filterByAssignee(todos, "Both");
    expect(result).toHaveLength(1);
    expect(result[0].assigned_to).toBe("Both");
  });

  it("returns only Lulu's todos", () => {
    const result = filterByAssignee(todos, "Lulu");
    expect(result).toHaveLength(1);
    expect(result[0].assigned_to).toBe("Lulu");
  });

  it("returns empty array when no match", () => {
    const result = filterByAssignee(todos, "NoOne");
    expect(result).toHaveLength(0);
  });
});

// ─── Filter: priority ─────────────────────────────────────────────────────────

describe("filter by priority", () => {
  const todos = [
    makeTodo({ id: "p1", priority: "high" }),
    makeTodo({ id: "p2", priority: "high" }),
    makeTodo({ id: "p3", priority: "medium" }),
    makeTodo({ id: "p4", priority: "low" }),
  ];

  const filterByPriority = (all: Todo[], p: string) =>
    all.filter((t) => t.priority === p);

  it("returns only high-priority todos", () => {
    expect(filterByPriority(todos, "high")).toHaveLength(2);
  });

  it("returns only medium-priority todos", () => {
    expect(filterByPriority(todos, "medium")).toHaveLength(1);
  });

  it("returns only low-priority todos", () => {
    expect(filterByPriority(todos, "low")).toHaveLength(1);
  });
});

// ─── Filter: is_completed ─────────────────────────────────────────────────────

describe("filter by is_completed", () => {
  const todos = [
    makeTodo({ id: "c1", is_completed: false }),
    makeTodo({ id: "c2", is_completed: false }),
    makeTodo({ id: "c3", is_completed: true }),
  ];

  it("returns only active (incomplete) todos when filtering for active", () => {
    const result = todos.filter((t) => !t.is_completed);
    expect(result).toHaveLength(2);
    expect(result.every((t) => !t.is_completed)).toBe(true);
  });

  it("returns only completed todos when filtering for completed", () => {
    const result = todos.filter((t) => t.is_completed);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c3");
  });
});

// ─── Sort: due_date asc (nulls last) ─────────────────────────────────────────

describe("sort by due_date asc, nulls last", () => {
  const todos = [
    makeTodo({ id: "d1", due_date: "2025-03-15" }),
    makeTodo({ id: "d2", due_date: null }),
    makeTodo({ id: "d3", due_date: "2025-03-10" }),
    makeTodo({ id: "d4", due_date: "2025-04-01" }),
    makeTodo({ id: "d5", due_date: null }),
  ];

  const sortByDueDateAsc = (all: Todo[]) =>
    [...all].sort((a, b) => {
      const aDate = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bDate = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return aDate - bDate;
    });

  it("earliest due_date comes first", () => {
    const sorted = sortByDueDateAsc(todos);
    expect(sorted[0].id).toBe("d3"); // 2025-03-10
  });

  it("latest dated item precedes nulls", () => {
    const sorted = sortByDueDateAsc(todos);
    expect(sorted[2].id).toBe("d4"); // 2025-04-01
  });

  it("null due_dates sort to the end", () => {
    const sorted = sortByDueDateAsc(todos);
    const lastTwo = sorted.slice(3);
    expect(lastTwo.every((t) => t.due_date === null)).toBe(true);
  });

  it("second item has the next earliest date", () => {
    const sorted = sortByDueDateAsc(todos);
    expect(sorted[1].id).toBe("d1"); // 2025-03-15
  });
});

// ─── Sort: priority desc ──────────────────────────────────────────────────────

describe("sort by priority desc (high → medium → low)", () => {
  const todos = [
    makeTodo({ id: "pr1", priority: "low" }),
    makeTodo({ id: "pr2", priority: "high" }),
    makeTodo({ id: "pr3", priority: "medium" }),
    makeTodo({ id: "pr4", priority: "high" }),
    makeTodo({ id: "pr5", priority: "low" }),
  ];

  const sortByPriorityDesc = (all: Todo[]) =>
    [...all].sort(
      (a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]
    );

  it("high-priority todos appear first", () => {
    const sorted = sortByPriorityDesc(todos);
    expect(sorted[0].priority).toBe("high");
    expect(sorted[1].priority).toBe("high");
  });

  it("medium comes after high", () => {
    const sorted = sortByPriorityDesc(todos);
    expect(sorted[2].priority).toBe("medium");
  });

  it("low-priority todos appear last", () => {
    const sorted = sortByPriorityDesc(todos);
    expect(sorted[3].priority).toBe("low");
    expect(sorted[4].priority).toBe("low");
  });
});

// ─── Filter: by label ─────────────────────────────────────────────────────────

describe("filter by label", () => {
  const todos = [
    makeTodo({ id: "l1" }),
    makeTodo({ id: "l2" }),
    makeTodo({ id: "l3" }),
    makeTodo({ id: "l4" }),
  ];

  const makeLabel = (id: string, name: string): Label => ({
    id,
    name,
    color: "#ff0000",
    created_at: "2025-01-01T00:00:00Z",
  });

  // l1 has labels: work, urgent
  // l2 has labels: personal
  // l3 has labels: work
  // l4 has no labels
  const todoLabelsMap = new Map<string, Label[]>([
    ["l1", [makeLabel("work", "Work"), makeLabel("urgent", "Urgent")]],
    ["l2", [makeLabel("personal", "Personal")]],
    ["l3", [makeLabel("work", "Work")]],
    ["l4", []],
  ]);

  const filterByLabel = (all: Todo[], labelId: string) =>
    all.filter((t) => {
      const labels = todoLabelsMap.get(t.id) ?? [];
      return labels.some((l) => l.id === labelId);
    });

  it("returns todos tagged with the 'work' label", () => {
    const result = filterByLabel(todos, "work");
    expect(result).toHaveLength(2);
    const ids = result.map((t) => t.id);
    expect(ids).toContain("l1");
    expect(ids).toContain("l3");
  });

  it("returns todos tagged with the 'urgent' label", () => {
    const result = filterByLabel(todos, "urgent");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("l1");
  });

  it("returns todos tagged with the 'personal' label", () => {
    const result = filterByLabel(todos, "personal");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("l2");
  });

  it("returns empty array when no todos have the given label", () => {
    const result = filterByLabel(todos, "nonexistent-label");
    expect(result).toHaveLength(0);
  });

  it("does not include todo with no labels", () => {
    const result = filterByLabel(todos, "work");
    const ids = result.map((t) => t.id);
    expect(ids).not.toContain("l4");
  });
});

// ─── Search logic ─────────────────────────────────────────────────────────────

describe("text search — title and description matching", () => {
  const todos = [
    makeTodo({ id: "s1", title: "Buy milk", description: null, parent_id: null }),
    makeTodo({ id: "s2", title: "Doctor appointment", description: "Bring insurance card", parent_id: null }),
    makeTodo({ id: "s3", title: "Grocery list", description: null, parent_id: null }),
    // subtask of s3 that mentions "eggs"
    makeTodo({ id: "s4", title: "Get eggs", description: null, parent_id: "s3" }),
    makeTodo({ id: "s5", title: "Call bank", description: "Ask about milk loan", parent_id: null }),
  ];

  /**
   * Mirrors the search logic in todo-list.tsx:
   * - Collect IDs of all matching todos (including subtasks).
   * - For subtasks, add the parent_id instead.
   * - Filter top-level todos whose id is in that set.
   */
  const search = (all: Todo[], q: string): Todo[] => {
    const lq = q.toLowerCase();
    const matchingIds = new Set<string>();
    for (const t of all) {
      if (
        t.title.toLowerCase().includes(lq) ||
        t.description?.toLowerCase().includes(lq)
      ) {
        matchingIds.add(t.parent_id ?? t.id);
      }
    }
    // Only top-level todos
    return all.filter((t) => !t.parent_id && matchingIds.has(t.id));
  };

  it("matches by title", () => {
    const result = search(todos, "milk");
    const ids = result.map((t) => t.id);
    expect(ids).toContain("s1");
  });

  it("matches by description", () => {
    const result = search(todos, "insurance");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s2");
  });

  it("includes parent todo when a subtask title matches", () => {
    // s4 (subtask of s3) has title "Get eggs" — searching "eggs" should return s3
    const result = search(todos, "eggs");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s3");
  });

  it("does not return the subtask itself as a top-level result", () => {
    const result = search(todos, "eggs");
    const ids = result.map((t) => t.id);
    expect(ids).not.toContain("s4");
  });

  it("returns multiple todos when multiple titles match", () => {
    const result = search(todos, "milk");
    const ids = result.map((t) => t.id);
    expect(ids).toContain("s1");
    expect(ids).toContain("s5"); // description contains "milk"
  });

  it("returns empty array when nothing matches", () => {
    const result = search(todos, "xyzzy-no-match");
    expect(result).toHaveLength(0);
  });
});
