import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { parseDateFromText } from "@/lib/parse-date";
import { format } from "date-fns";

// Pin "now" to a known Monday so relative keywords are predictable.
// 2025-03-10 is a Monday.
const FAKE_NOW = new Date("2025-03-10T09:00:00.000Z");

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FAKE_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

// ─── Returns null for non-date text ─────────────────────────────────────────

describe("parseDateFromText — no date present", () => {
  it("returns null for plain text with no date", () => {
    expect(parseDateFromText("Buy milk")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(parseDateFromText("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(parseDateFromText("   ")).toBeNull();
  });
});

// ─── Relative date keywords ──────────────────────────────────────────────────

describe("parseDateFromText — 'today'", () => {
  it("extracts today from a task title", () => {
    const result = parseDateFromText("Do laundry today");
    expect(result).not.toBeNull();
  });

  it("returns a dateStr in yyyy-MM-dd format matching today", () => {
    const result = parseDateFromText("Do laundry today");
    const todayStr = format(FAKE_NOW, "yyyy-MM-dd");
    expect(result!.dateStr).toBe(todayStr);
  });

  it("labels today as 'Today'", () => {
    const result = parseDateFromText("Do laundry today");
    expect(result!.label).toBe("Today");
  });

  it("strips 'today' from the title", () => {
    const result = parseDateFromText("Do laundry today");
    expect(result!.textWithoutDate).toBe("Do laundry");
  });
});

describe("parseDateFromText — 'tomorrow'", () => {
  it("extracts tomorrow from a task title", () => {
    const result = parseDateFromText("Call dentist tomorrow");
    expect(result).not.toBeNull();
  });

  it("returns a dateStr one day after today", () => {
    const result = parseDateFromText("Call dentist tomorrow");
    const tomorrowStr = format(
      new Date(FAKE_NOW.getTime() + 86_400_000),
      "yyyy-MM-dd"
    );
    expect(result!.dateStr).toBe(tomorrowStr);
  });

  it("labels tomorrow as 'Tomorrow'", () => {
    const result = parseDateFromText("Call dentist tomorrow");
    expect(result!.label).toBe("Tomorrow");
  });

  it("strips 'tomorrow' from the title", () => {
    const result = parseDateFromText("Call dentist tomorrow");
    expect(result!.textWithoutDate).toBe("Call dentist");
  });
});

// ─── Explicit date: "March 20" ────────────────────────────────────────────────

describe("parseDateFromText — explicit 'March 20'", () => {
  it("returns a result for 'March 20'", () => {
    const result = parseDateFromText("Doctor appointment March 20");
    expect(result).not.toBeNull();
  });

  it("returns dateStr '2025-03-20'", () => {
    const result = parseDateFromText("Doctor appointment March 20");
    expect(result!.dateStr).toBe("2025-03-20");
  });

  it("strips 'March 20' from the title", () => {
    const result = parseDateFromText("Doctor appointment March 20");
    expect(result!.textWithoutDate).toBe("Doctor appointment");
  });

  it("returns a non-Today, non-Tomorrow label", () => {
    const result = parseDateFromText("Doctor appointment March 20");
    expect(result!.label).not.toBe("Today");
    expect(result!.label).not.toBe("Tomorrow");
    // Should be in the form "Thu Mar 20"
    expect(result!.label).toContain("Mar");
  });
});

// ─── Relative: "next Monday" ─────────────────────────────────────────────────

describe("parseDateFromText — 'next Monday'", () => {
  it("returns a result", () => {
    const result = parseDateFromText("Team meeting next Monday");
    expect(result).not.toBeNull();
  });

  it("returns a dateStr in yyyy-MM-dd format", () => {
    const result = parseDateFromText("Team meeting next Monday");
    expect(result!.dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("strips the date phrase from the title", () => {
    const result = parseDateFromText("Team meeting next Monday");
    expect(result!.textWithoutDate).not.toContain("Monday");
  });
});

// ─── date is a valid Date object ─────────────────────────────────────────────

describe("parseDateFromText — returned date object", () => {
  it("returns a Date instance in the date field", () => {
    const result = parseDateFromText("Review PR tomorrow");
    expect(result!.date).toBeInstanceOf(Date);
  });

  it("dateStr matches format(date, 'yyyy-MM-dd')", () => {
    const result = parseDateFromText("Review PR tomorrow");
    expect(result!.dateStr).toBe(format(result!.date, "yyyy-MM-dd"));
  });
});
