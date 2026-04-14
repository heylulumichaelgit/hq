"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FamilyAvatar, familyAvatarMeta } from "@/components/family-avatar";

export const PEOPLE = ["Andrew", "Chrystalla", "Lulu"] as const;
export type Person = (typeof PEOPLE)[number];

function Avatar({ person, size = "sm" }: { person: string; size?: "sm" | "xs" }) {
  const meta = familyAvatarMeta(person);
  return (
    <FamilyAvatar
      name={person}
      className={cn(size === "sm" ? "h-5 w-5" : "h-4 w-4")}
      fallbackClassName={cn(
        size === "sm" ? "text-[10px] font-bold" : "text-[9px] font-bold",
        meta.colors
      )}
    />
  );
}

export function parseAssignees(value: string): Person[] {
  if (value === "Both") return ["Andrew", "Chrystalla"];
  return value.split(",").map((p) => p.trim()).filter((p): p is Person => PEOPLE.includes(p as Person));
}

export function formatAssignees(people: Person[]): string {
  return people.join(",") || PEOPLE[0];
}

interface AssigneePickerProps {
  value: string;
  onChange: (value: string) => void;
  /** compact = small trigger for inline use (e.g. quick-add toolbar) */
  compact?: boolean;
}

export function AssigneePicker({ value, onChange, compact = false }: AssigneePickerProps) {
  const selected = parseAssignees(value);

  const toggle = (person: Person) => {
    const next = selected.includes(person)
      ? selected.filter((p) => p !== person)
      : [...selected, person];
    // Always keep at least one
    onChange(formatAssignees(next.length ? next : [person]));
  };

  const label = selected.length === 0
    ? "No one"
    : selected.length === PEOPLE.length
    ? "Everyone"
    : selected.join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        {compact ? (
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-input bg-background px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-0.5">
              {selected.map((p) => <Avatar key={p} person={p} size="xs" />)}
            </span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </button>
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm hover:bg-accent transition-colors w-full"
          >
            <span className="flex items-center gap-1">
              {selected.map((p) => <Avatar key={p} person={p} size="sm" />)}
            </span>
            <span className="flex-1 text-left text-sm">{label}</span>
            <ChevronDown className="h-4 w-4 opacity-50 shrink-0" />
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="start">
        {PEOPLE.map((person) => (
          <button
            key={person}
            type="button"
            onClick={() => toggle(person)}
            className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            <Checkbox
              checked={selected.includes(person)}
              onCheckedChange={() => toggle(person)}
              className="pointer-events-none"
            />
            <Avatar person={person} size="sm" />
            <span>{person}</span>
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
