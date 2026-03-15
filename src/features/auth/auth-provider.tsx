"use client";

import { useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "./store";

const AUTH_PAGES = ["/login", "/auth", "/forgot-password", "/reset-password"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();
    const isAuthPage = AUTH_PAGES.some((p) =>
      window.location.pathname.startsWith(p)
    );

    const loadProfile = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (profile) setProfile(profile);
    };

    const initAuth = async () => {
      try {
        // getSession() reads from local cookies — no network call, no timeout risk.
        // The Next.js middleware validates sessions cryptographically on every
        // server request, so we don't need to call the Supabase auth server here.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          if (!isAuthPage) window.location.href = "/login";
          setLoading(false);
          return;
        }

        setUser(session.user);
        await loadProfile(session.user.id);
      } catch {
        // A network/profile error is NOT a reason to log the user out.
        // The middleware will redirect unauthenticated requests server-side.
      }
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const user = session?.user ?? null;
      setUser(user);

      if (user) {
        await loadProfile(user.id);
      } else {
        setProfile(null);
        // Only redirect on a genuine sign-out (session expired, explicit logout).
        if (!isAuthPage) window.location.href = "/login";
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
