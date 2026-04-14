import { createClient } from "@/lib/supabase/client";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

export const AUTH_FETCH_TIMEOUT_MS = 4000;

export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export type RehydrateResult =
  | { status: "authenticated"; session: Session }
  | { status: "unauthenticated" }
  | { status: "error"; error: Error };

// Read the current session, and if it's missing or expired, try a refresh.
// Both calls are wrapped in a timeout so a hung iOS PWA fetch can't leave us
// stuck on an infinite loading state.
export async function rehydrateSession(): Promise<RehydrateResult> {
  const supabase = createClient();

  try {
    const {
      data: { session },
      error,
    } = await withTimeout(
      supabase.auth.getSession(),
      AUTH_FETCH_TIMEOUT_MS,
      "auth.getSession"
    );

    if (error) {
      console.error("[auth] getSession failed:", error);
      return { status: "error", error };
    }

    if (session) {
      return { status: "authenticated", session };
    }

    const {
      data: { session: refreshed },
      error: refreshError,
    } = await withTimeout(
      supabase.auth.refreshSession(),
      AUTH_FETCH_TIMEOUT_MS,
      "auth.refreshSession"
    );

    if (refreshError || !refreshed) {
      return { status: "unauthenticated" };
    }

    return { status: "authenticated", session: refreshed };
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    console.error("[auth] rehydrateSession threw:", error);
    return { status: "error", error };
  }
}

export async function loadProfile(userId: string): Promise<Profile | null> {
  try {
    const supabase = createClient();
    const { data, error } = await withTimeout(
      supabase.from("profiles").select("*").eq("id", userId).single(),
      AUTH_FETCH_TIMEOUT_MS,
      "profiles.select"
    );
    if (error) {
      console.error("[auth] loadProfile error:", error);
      return null;
    }
    return (data as Profile) ?? null;
  } catch (e) {
    console.error("[auth] loadProfile threw:", e);
    return null;
  }
}
