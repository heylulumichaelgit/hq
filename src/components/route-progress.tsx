"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<"idle" | "loading" | "complete">("idle");
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      setState("loading");
      const timer = setTimeout(() => {
        setState("complete");
        const clear = setTimeout(() => setState("idle"), 300);
        return () => clearTimeout(clear);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [pathname]);

  if (state === "idle") return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-[2px] pointer-events-none"
      style={{
        background: "var(--primary)",
        animation:
          state === "loading"
            ? "route-progress 2s ease-out forwards"
            : "route-progress-complete 0.3s ease-out forwards",
      }}
    />
  );
}
