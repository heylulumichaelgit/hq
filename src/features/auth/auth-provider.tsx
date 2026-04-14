"use client";

import { useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "./store";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const AUTH_PAGES = ["/login", "/auth", "/forgot-password", "/reset-password"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setProfile, setLoading, setReady } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const isOnAuthPage = () =>
      AUTH_PAGES.some((p) => window.location.pathname.startsWith(p));

    const redirectToLogin = () => {
      setReady(true);
      if (!isOnAuthPage()) {
        // Set loading false BEFORE redirect — in iOS standalone PWA,
        // the navigation can stall, leaving the app in perpetual loading.
        setLoading(false);
        window.location.href = "/login";
      } else {
        setLoading(false);
      }
    };

    const loadProfile = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (profile) setProfile(profile);
    };

    // Safety timeout: if auth init stalls, mark auth ready so data hooks can
    // stop waiting forever and either recover or redirect.
    const safetyTimeout = setTimeout(() => {
      setReady(true);
      setLoading(false);
    }, 5000);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      clearTimeout(safetyTimeout);
      const user = session?.user ?? null;
      setUser(user);

      if (user) {
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
        setReady(true);
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        // Supabase fires SIGNED_OUT on transient token refresh failures too.
        // Try to recover before actually logging out.
        const { data: refreshed } = await supabase.auth.refreshSession();
        if (refreshed?.session) {
          setUser(refreshed.session.user);
          setReady(true);
          setLoading(false);
          return;
        }
        setProfile(null);
        redirectToLogin();
      } else if (event === "INITIAL_SESSION") {
        // No session at startup → redirect to login
        setProfile(null);
        redirectToLogin();
      } else {
        setReady(true);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [setUser, setProfile, setLoading, setReady]);

  return <>{children}</>;
}
