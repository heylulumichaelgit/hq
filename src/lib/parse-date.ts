import * as chrono from "chrono-node";
import { format, isValid } from "date-fns";

export interface ParsedDate {
  date: Date;
  dateStr: string;       // yyyy-MM-dd for the input
  label: string;         // human-readable: "Today", "Tomorrow", "Mon Mar 18", etc.
  textWithoutDate: string; // original text with the date portion removed
}

/**
 * Parses a natural language date from a text string.
 * Returns null if no date is found.
 */
export function parseDateFromText(text: string): ParsedDate | null {
  if (!text.trim()) return null;

  const results = chrono.parse(text, new Date(), { forwardDate: true });
  if (!results.length) return null;

  const result = results[0];
  const date = result.date();
  if (!isValid(date)) return null;

  const dateStr = format(date, "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");
  const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

  let label: string;
  if (dateStr === today) label = "Today";
  else if (dateStr === tomorrow) label = "Tomorrow";
  else label = format(date, "EEE MMM d");

  // Remove the matched date text from the title
  const textWithoutDate = (
    text.slice(0, result.index) +
    text.slice(result.index + result.text.length)
  ).replace(/\s{2,}/g, " ").trim();

  return { date, dateStr, label, textWithoutDate };
}
