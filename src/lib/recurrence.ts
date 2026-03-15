import { addDays, addWeeks, addMonths, addYears, format, nextDay, getDay } from "date-fns";
import type { Day } from "date-fns";

export const RECURRENCE_OPTIONS = [
  { value: "daily",     label: "Daily" },
  { value: "weekdays",  label: "Every weekday" },
  { value: "weekly",    label: "Weekly" },
  { value: "biweekly",  label: "Every 2 weeks" },
  { value: "monthly",   label: "Monthly" },
  { value: "yearly",    label: "Yearly" },
] as const;

export type RecurrenceRule = typeof RECURRENCE_OPTIONS[number]["value"];

export function getRecurrenceLabel(rule: string): string {
  return RECURRENCE_OPTIONS.find((o) => o.value === rule)?.label ?? rule;
}

/**
 * Given a recurrence rule and the current due date, return the next due date string (yyyy-MM-dd).
 * If no due date is set, uses today as the base.
 */
export function getNextDueDate(rule: string, currentDue: string | null): string {
  const base = currentDue ? new Date(currentDue + "T00:00:00") : new Date();

  let next: Date;

  switch (rule) {
    case "daily":
      next = addDays(base, 1);
      break;
    case "weekdays": {
      next = addDays(base, 1);
      // Skip Saturday (6) and Sunday (0)
      while (getDay(next) === 0 || getDay(next) === 6) {
        next = addDays(next, 1);
      }
      break;
    }
    case "weekly":
      next = addWeeks(base, 1);
      break;
    case "biweekly":
      next = addWeeks(base, 2);
      break;
    case "monthly":
      next = addMonths(base, 1);
      break;
    case "yearly":
      next = addYears(base, 1);
      break;
    default:
      next = addDays(base, 1);
  }

  return format(next, "yyyy-MM-dd");
}
