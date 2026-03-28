"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const THRESHOLD = 80; // px to pull before triggering
const MAX_PULL = 120; // px cap on visual drag

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const pullingRef = useRef(false);
  const refreshingRef = useRef(false);
  const crossedThresholdRef = useRef(false);
  const pullDistanceRef = useRef(0);

  const stableRefresh = useCallback(onRefresh, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      // Only activate when scrolled to very top
      if (window.scrollY > 2) return;
      startYRef.current = e.touches[0].clientY;
      pullingRef.current = false;
      crossedThresholdRef.current = false;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startYRef.current === null || refreshingRef.current) return;
      if (window.scrollY > 2) {
        startYRef.current = null;
        return;
      }

      const delta = e.touches[0].clientY - startYRef.current;
      if (delta <= 0) return;

      pullingRef.current = true;
      // Rubber-band feel: slow down as it approaches max
      const capped = Math.min(delta * 0.5, MAX_PULL);
      pullDistanceRef.current = capped;
      setPullDistance(capped);

      // Haptic when crossing threshold
      if (capped >= THRESHOLD && !crossedThresholdRef.current) {
        crossedThresholdRef.current = true;
        if (navigator.vibrate) navigator.vibrate(10);
      } else if (capped < THRESHOLD) {
        crossedThresholdRef.current = false;
      }

      // Prevent native scroll bounce while pulling
      if (delta > 5) e.preventDefault();
    };

    const onTouchEnd = async () => {
      if (!pullingRef.current) return;
      const dist = pullDistanceRef.current;
      if (dist >= THRESHOLD && !refreshingRef.current) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullDistance(0);
        await new Promise((r) => setTimeout(r, 300));
        try {
          await stableRefresh();
        } finally {
          setRefreshing(false);
          refreshingRef.current = false;
        }
      } else {
        setPullDistance(0);
      }
      startYRef.current = null;
      pullingRef.current = false;
      pullDistanceRef.current = 0;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [stableRefresh]);

  return { pullDistance, refreshing };
}
