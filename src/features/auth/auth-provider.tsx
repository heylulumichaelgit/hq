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

    const forceCleanLogout = () => {
      document.cookie.split(";").forEach((c) => {
        const name = c.trim().split("=")[0];
        if (name.startsWith("sb-")) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
        }
      });
      supabase.auth.signOut().catch(() => {});
      window.location.href = "/login";
    };

    const initAuth = async () => {
      try {
        // Timeout getUser — if the session is broken this can hang
        const getUserPromise = supabase.auth.getUser();
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Auth check timed out")), 8000)
        );

        const {
          data: { user },
          error,
        } = await Promise.race([getUserPromise, timeout]);

        if (error || !user) {
          if (!isAuthPage) {
            forceCleanLogout();
            return;
          }
          setLoading(false);
          return;
        }

        setUser(user);
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profile) setProfile(profile);
      } catch {
        if (!isAuthPage) {
          forceCleanLogout();
          return;
        }
      }
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setUser(user);
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profile) setProfile(profile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setProfile, setLoading]);

  return <>{children}</>;
}
