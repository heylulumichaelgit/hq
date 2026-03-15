import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { getNextDueDate, getRecurrenceLabel } from "@/lib/recurrence";
import { format } from "date-fns";

// ─── getRecurrenceLabel ──────────────────────────────────────────────────────

describe("getRecurrenceLabel", () => {
  it("returns 'Daily' for 'daily'", () => {
    expect(getRecurrenceLabel("daily")).toBe("Daily");
  });

  it("returns 'Every weekday' for 'weekdays'", () => {
    expect(getRecurrenceLabel("weekdays")).toBe("Every weekday");
  });

  it("returns 'Weekly' for 'weekly'", () => {
    expect(getRecurrenceLabel("weekly")).toBe("Weekly");
  });

  it("returns 'Every 2 weeks' for 'biweekly'", () => {
    expect(getRecurrenceLabel("biweekly")).toBe("Every 2 weeks");
  });

  it("returns 'Monthly' for 'monthly'", () => {
    expect(getRecurrenceLabel("monthly")).toBe("Monthly");
  });

  it("returns 'Yearly' for 'yearly'", () => {
    expect(getRecurrenceLabel("yearly")).toBe("Yearly");
  });

  it("returns the raw rule string for an unknown rule", () => {
    expect(getRecurrenceLabel("fortnightly")).toBe("fortnightly");
  });
});

// ─── getNextDueDate ──────────────────────────────────────────────────────────

describe("getNextDueDate — daily", () => {
  it("advances by exactly 1 day", () => {
    expect(getNextDueDate("daily", "2025-03-10")).toBe("2025-03-11");
  });

  it("crosses a month boundary", () => {
    expect(getNextDueDate("daily", "2025-01-31")).toBe("2025-02-01");
  });
});

describe("getNextDueDate — weekdays", () => {
  it("Monday → Tuesday", () => {
    // 2025-03-10 is a Monday
    expect(getNextDueDate("weekdays", "2025-03-10")).toBe("2025-03-11");
  });

  it("Friday → Monday (skips Saturday and Sunday)", () => {
    // 2025-03-14 is a Friday
    expect(getNextDueDate("weekdays", "2025-03-14")).toBe("2025-03-17");
  });

  it("Saturday → Monday (skips to the next weekday)", () => {
    // 2025-03-15 is a Saturday
    expect(getNextDueDate("weekdays", "2025-03-15")).toBe("2025-03-17");
  });

  it("Sunday → Monday", () => {
    // 2025-03-16 is a Sunday
    expect(getNextDueDate("weekdays", "2025-03-16")).toBe("2025-03-17");
  });

  it("Thursday → Friday", () => {
    // 2025-03-13 is a Thursday
    expect(getNextDueDate("weekdays", "2025-03-13")).toBe("2025-03-14");
  });
});

describe("getNextDueDate — weekly", () => {
  it("returns the same weekday one week later", () => {
    expect(getNextDueDate("weekly", "2025-03-10")).toBe("2025-03-17");
  });
});

describe("getNextDueDate — biweekly", () => {
  it("returns the date exactly 2 weeks later", () => {
    expect(getNextDueDate("biweekly", "2025-03-10")).toBe("2025-03-24");
  });
});

describe("getNextDueDate — monthly", () => {
  it("returns the same date of the following month", () => {
    expect(getNextDueDate("monthly", "2025-03-10")).toBe("2025-04-10");
  });

  it("handles year rollover from December", () => {
    expect(getNextDueDate("monthly", "2025-12-01")).toBe("2026-01-01");
  });

  it("Jan 31 → Feb 28 (non-leap year)", () => {
    expect(getNextDueDate("monthly", "2025-01-31")).toBe("2025-02-28");
  });

  it("Jan 31 → Feb 29 (leap year)", () => {
    expect(getNextDueDate("monthly", "2024-01-31")).toBe("2024-02-29");
  });

  it("Mar 31 → Apr 30 (April has only 30 days)", () => {
    expect(getNextDueDate("monthly", "2025-03-31")).toBe("2025-04-30");
  });
});

describe("getNextDueDate — yearly", () => {
  it("returns the same month and day one year later", () => {
    expect(getNextDueDate("yearly", "2025-03-10")).toBe("2026-03-10");
  });
});

describe("getNextDueDate — null currentDue", () => {
  it("falls back to today+1 day when currentDue is null (daily rule)", () => {
    // Freeze date so the test is deterministic
    const fakeNow = new Date("2025-03-10T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);

    const result = getNextDueDate("daily", null);
    // today is 2025-03-10, so next day should be 2025-03-11
    const expected = format(new Date("2025-03-11T00:00:00"), "yyyy-MM-dd");
    expect(result).toBe(expected);

    vi.useRealTimers();
  });

  it("falls back to today+1 for an unknown rule when currentDue is null", () => {
    const fakeNow = new Date("2025-06-15T00:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);

    const result = getNextDueDate("unknown-rule", null);
    const expected = format(new Date("2025-06-16T00:00:00"), "yyyy-MM-dd");
    expect(result).toBe(expected);

    vi.useRealTimers();
  });
});

describe("getNextDueDate — unknown rule falls back to daily logic", () => {
  it("advances by 1 day for an unrecognised rule with a currentDue", () => {
    expect(getNextDueDate("quarterly", "2025-03-10")).toBe("2025-03-11");
  });
});
