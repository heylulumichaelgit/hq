"use client";

import { useEffect, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "./store";
import { rehydrateSession, loadProfile } from "./session";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

const AUTH_PAGES = ["/login", "/auth", "/forgot-password", "/reset-password"];
const INIT_SAFETY_TIMEOUT_MS = 5000;

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let lastKnownUserId: string | null = null;

    const isOnAuthPage = () =>
      AUTH_PAGES.some((p) => window.location.pathname.startsWith(p));

    const applyAuthenticated = async (user: User, reloadProfile: boolean) => {
      if (disposed) return;
      const userChanged = user.id !== lastKnownUserId;
      lastKnownUserId = user.id;

      // Clear profile when switching users so the UI doesn't briefly show
      // the previous user's profile alongside the new user object.
      useAuthStore.setState({
        user,
        profile: userChanged ? null : useAuthStore.getState().profile,
        isReady: true,
        isLoading: false,
      });

      if (!reloadProfile) return;
      const profile = await loadProfile(user.id);
      if (disposed) return;
      if (profile) {
        useAuthStore.setState({ profile });
      }
    };

    const redirectToLogin = () => {
      if (disposed) return;
      lastKnownUserId = null;
      // Set loading false BEFORE navigating — in iOS standalone PWA the
      // navigation can stall, leaving the app on an infinite loader.
      useAuthStore.setState({
        user: null,
        profile: null,
        isReady: true,
        isLoading: false,
      });
      if (!isOnAuthPage()) {
        window.location.href = "/login";
      }
    };

    // Explicit session check used by the safety timeout and on PWA resume.
    // This is the escape hatch for the case where onAuthStateChange never
    // fires (iOS bfcache restore, hung fetch, etc.). iOS can fire
    // visibilitychange + pageshow + focus in quick succession on resume, so
    // we dedupe concurrent calls behind a single in-flight promise.
    let inFlightRecovery: Promise<void> | null = null;
    const recoverSession = (): Promise<void> => {
      if (inFlightRecovery) return inFlightRecovery;
      inFlightRecovery = (async () => {
        if (disposed) return;
        const result = await rehydrateSession();
        if (disposed) return;

        if (result.status === "authenticated") {
          const userChanged = result.session.user.id !== lastKnownUserId;
          await applyAuthenticated(result.session.user, userChanged);
          return;
        }

        if (result.status === "unauthenticated") {
          redirectToLogin();
          return;
        }

        // Transient error. If we already had a user, keep the UI unblocked
        // so cached data stays visible. If we had no user, leave isReady=false
        // so BootGate continues showing the splash with its retry button.
        const existingUser = useAuthStore.getState().user;
        if (existingUser) {
          useAuthStore.setState({ isReady: true, isLoading: false });
        }
      })().finally(() => {
        inFlightRecovery = null;
      });
      return inFlightRecovery;
    };

    // If onAuthStateChange hasn't fired by this deadline, manually recover.
    const safetyTimeout = setTimeout(() => {
      if (disposed) return;
      void recoverSession();
    }, INIT_SAFETY_TIMEOUT_MS);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        clearTimeout(safetyTimeout);
        if (disposed) return;
        const user = session?.user ?? null;

        if (user) {
          const userChanged = user.id !== lastKnownUserId;
          const shouldLoadProfile =
            userChanged ||
            event === "SIGNED_IN" ||
            event === "USER_UPDATED" ||
            event === "INITIAL_SESSION";
          await applyAuthenticated(user, shouldLoadProfile);
          return;
        }

        if (event === "SIGNED_OUT") {
          // Supabase can fire SIGNED_OUT on transient refresh failures too.
          // Try to recover before redirecting.
          const result = await rehydrateSession();
          if (disposed) return;
          if (result.status === "authenticated") {
            await applyAuthenticated(result.session.user, true);
            return;
          }
          redirectToLogin();
          return;
        }

        if (event === "INITIAL_SESSION") {
          redirectToLogin();
          return;
        }

        useAuthStore.setState({ isReady: true, isLoading: false });
      }
    );

    // PWA resume handling. iOS suspends the JS context when the standalone
    // app is closed, and on restore `onAuthStateChange` may never fire.
    // We explicitly re-check the session on visibility and pageshow.
    const handleResume = () => {
      if (document.visibilityState !== "visible") return;
      void recoverSession();
    };

    const handlePageShow = (event: PageTransitionEvent) => {
      // `persisted` is true when the page came from the bfcache — the
      // canonical PWA resume signal on iOS.
      if (event.persisted) {
        void recoverSession();
      }
    };

    document.addEventListener("visibilitychange", handleResume);
    window.addEventListener("pageshow", handlePageShow);
    // Some iOS versions fire focus but not visibilitychange on PWA resume.
    window.addEventListener("focus", handleResume);

    return () => {
      disposed = true;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleResume);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleResume);
    };
  }, []);

  return <>{children}</>;
}
