"use client";

import { useEffect, useRef, useState } from "react";

const THRESHOLD = 80; // px to pull before triggering
const MAX_PULL = 120; // px cap on visual drag

export function usePullToRefresh(onRefresh: () => void) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      // Only activate when scrolled to very top
      if (window.scrollY > 2) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null) return;
      if (window.scrollY > 2) {
        startYRef.current = null;
        return;
      }

      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) return;

      pullingRef.current = true;
      // Rubber-band feel: slow down as it approaches max
      const capped = Math.min(delta * 0.5, MAX_PULL);
      setPullDistance(capped);

      // Prevent native scroll bounce while pulling
      if (delta > 5) e.preventDefault();
    };

    const onTouchEnd = () => {
      if (!pullingRef.current) return;
      if (pullDistance >= THRESHOLD) {
        setRefreshing(true);
        setPullDistance(0);
        // Small delay so the spinner is visible before reload
        setTimeout(() => {
          onRefresh();
        }, 400);
      } else {
        setPullDistance(0);
      }
      startYRef.current = null;
      pullingRef.current = false;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, onRefresh]);

  return { pullDistance, refreshing };
}
