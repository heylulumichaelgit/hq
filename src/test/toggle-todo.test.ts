/**
 * Tests for the recurrence logic embedded in useToggleTodo.
 *
 * The mutation calls getNextDueDate when completing a recurring todo.
 * We test that logic directly — both via getNextDueDate (pure) and
 * by simulating what the mutation would write to Supabase.
 */
import { describe, it, expect } from "vitest";
import { getNextDueDate } from "@/lib/recurrence";

// ─── Helper: mimic the payload the mutation builds ───────────────────────────

interface TogglePayload {
  is_completed: boolean;
  due_date?: string;
}

/**
 * Pure version of the mutation logic in useToggleTodo.
 * Returns the update payload that would be sent to Supabase.
 */
function buildTogglePayload(params: {
  is_completed: boolean;
  recurrence_rule?: string | null;
  due_date?: string | null;
}): TogglePayload {
  const { is_completed, recurrence_rule, due_date } = params;

  if (is_completed && recurrence_rule) {
    const nextDue = getNextDueDate(recurrence_rule, due_date ?? null);
    return { is_completed: false, due_date: nextDue };
  }

  return { is_completed };
}

// ─── Non-recurring todo ───────────────────────────────────────────────────────

describe("useToggleTodo mutation payload — non-recurring todo", () => {
  it("sets is_completed = true when completing a non-recurring todo", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: null,
      due_date: "2025-03-10",
    });
    expect(payload.is_completed).toBe(true);
  });

  it("does not include due_date when completing a non-recurring todo", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: null,
      due_date: "2025-03-10",
    });
    expect(payload.due_date).toBeUndefined();
  });

  it("sets is_completed = false when uncompleting a non-recurring todo", () => {
    const payload = buildTogglePayload({
      is_completed: false,
      recurrence_rule: null,
      due_date: "2025-03-10",
    });
    expect(payload.is_completed).toBe(false);
  });
});

// ─── Recurring daily todo ─────────────────────────────────────────────────────

describe("useToggleTodo mutation payload — recurring daily todo", () => {
  it("sets is_completed = false (keep visible) instead of true", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "daily",
      due_date: "2025-03-10",
    });
    expect(payload.is_completed).toBe(false);
  });

  it("advances due_date by 1 day", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "daily",
      due_date: "2025-03-10",
    });
    expect(payload.due_date).toBe("2025-03-11");
  });

  it("includes due_date in the payload", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "daily",
      due_date: "2025-03-10",
    });
    expect(payload.due_date).toBeDefined();
  });
});

// ─── Recurring weekday todo ───────────────────────────────────────────────────

describe("useToggleTodo mutation payload — recurring weekday todo due on Friday", () => {
  // 2025-03-14 is a Friday
  it("sets is_completed = false", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "weekdays",
      due_date: "2025-03-14",
    });
    expect(payload.is_completed).toBe(false);
  });

  it("advances due_date to the following Monday (skips weekend)", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "weekdays",
      due_date: "2025-03-14",
    });
    expect(payload.due_date).toBe("2025-03-17");
  });
});

// ─── Recurring weekly todo ────────────────────────────────────────────────────

describe("useToggleTodo mutation payload — recurring weekly todo", () => {
  it("sets is_completed = false", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "weekly",
      due_date: "2025-03-10",
    });
    expect(payload.is_completed).toBe(false);
  });

  it("advances due_date by exactly 7 days", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "weekly",
      due_date: "2025-03-10",
    });
    expect(payload.due_date).toBe("2025-03-17");
  });
});

// ─── Recurring monthly todo ───────────────────────────────────────────────────

describe("useToggleTodo mutation payload — recurring monthly todo", () => {
  it("advances due_date by one month", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "monthly",
      due_date: "2025-03-10",
    });
    expect(payload.due_date).toBe("2025-04-10");
  });
});

// ─── Recurring yearly todo ────────────────────────────────────────────────────

describe("useToggleTodo mutation payload — recurring yearly todo", () => {
  it("advances due_date by one year", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "yearly",
      due_date: "2025-03-10",
    });
    expect(payload.due_date).toBe("2026-03-10");
  });
});

// ─── Completing a recurring todo when due_date is null ───────────────────────

describe("useToggleTodo mutation payload — recurring todo with null due_date", () => {
  it("still sets is_completed = false", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "daily",
      due_date: null,
    });
    expect(payload.is_completed).toBe(false);
  });

  it("still produces a due_date string (falls back to today + 1)", () => {
    const payload = buildTogglePayload({
      is_completed: true,
      recurrence_rule: "daily",
      due_date: null,
    });
    expect(payload.due_date).toBeDefined();
    expect(payload.due_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
