"use client";

import type { Person } from "../components/assignee-picker";
import { useAuthStore } from "@/features/auth/store";

export const EMAIL_TO_PERSON: Record<string, Person> = {
  "andrewmichaelsa@gmail.com": "Andrew",
  "chrystalla.pieri@gmail.com": "Chrystalla",
  // "lulu@example.com": "Lulu",
};

export function useMyPerson(): Person | null {
  const { user } = useAuthStore();
  const email = user?.email;
  if (!email) return "Lulu";
  return EMAIL_TO_PERSON[email] ?? null;
}
