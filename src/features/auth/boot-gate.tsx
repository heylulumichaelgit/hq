"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "./store";
import { rehydrateSession, loadProfile } from "./session";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const RETRY_PROMPT_AFTER_MS = 8000;

const AUTH_ROUTES = ["/login", "/auth", "/forgot-password", "/reset-password"];

export function BootGate({ children }: { children: ReactNode }) {
  const isReady = useAuthStore((s) => s.isReady);
  const pathname = usePathname();
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const onAuthRoute = AUTH_ROUTES.some((p) => pathname.startsWith(p));
  const showRetry = hasTimedOut && !isReady && !retrying;

  useEffect(() => {
    if (isReady || onAuthRoute) return;
    const timer = setTimeout(() => setHasTimedOut(true), RETRY_PROMPT_AFTER_MS);
    return () => clearTimeout(timer);
  }, [isReady, onAuthRoute]);

  // Login / reset-password pages should render immediately — they don't
  // depend on auth state and gating them would create a chicken-and-egg
  // loop for signed-out users.
  if (onAuthRoute) return <>{children}</>;

  if (isReady) return <>{children}</>;

  const handleRetry = async () => {
    setRetrying(true);
    setHasTimedOut(false);
    const result = await rehydrateSession();
    if (result.status === "authenticated") {
      const profile = await loadProfile(result.session.user.id);
      useAuthStore.setState({
        user: result.session.user,
        profile,
        isReady: true,
        isLoading: false,
      });
      setRetrying(false);
      return;
    }
    if (result.status === "unauthenticated") {
      window.location.href = "/login";
      return;
    }
    setRetrying(false);
    setHasTimedOut(true);
  };

  const handleHardReload = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-6">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {retrying ? "Restoring your session…" : "Loading your family hub…"}
        </p>
      </div>

      {showRetry && (
        <div className="flex max-w-xs flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-xs font-medium">Taking longer than usual</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your connection may have dropped. Try again or reload the app.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleRetry} className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
            <Button size="sm" variant="outline" onClick={handleHardReload}>
              Reload
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
