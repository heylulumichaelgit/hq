"use client";

import { useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "./store";

const AUTH_PAGES = ["/login", "/auth", "/forgot-password", "/reset-password"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const loadProfile = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (profile) setProfile(profile);
    };

    // onAuthStateChange fires INITIAL_SESSION synchronously on subscribe with the
    // current session state — no need for a separate initAuth() that races it.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setUser(user);

      if (user) {
        // Load profile only on meaningful events — TOKEN_REFRESHED fires hourly
        // and the profile hasn't changed, so skip it to avoid extra DB load.
        if (
          event === "SIGNED_IN" ||
          event === "INITIAL_SESSION" ||
          event === "USER_UPDATED"
        ) {
          try {
            await loadProfile(user.id);
          } catch {
            // Profile load failure is non-fatal; the user is still authenticated.
          }
        }
      } else if (event === "SIGNED_OUT") {
        // Redirect only on an intentional sign-out, not on transient token-refresh
        // failures that temporarily yield a null session (avoids spurious logouts).
        setProfile(null);
        const onAuthPage = AUTH_PAGES.some((p) =>
          window.location.pathname.startsWith(p)
        );
        if (!onAuthPage) window.location.href = "/login";
      } else if (event === "INITIAL_SESSION") {
        // No session at startup → redirect to login
        const onAuthPage = AUTH_PAGES.some((p) =>
          window.location.pathname.startsWith(p)
        );
        if (!onAuthPage) window.location.href = "/login";
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
