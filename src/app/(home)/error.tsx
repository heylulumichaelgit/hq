"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function HomeError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Home dashboard failed to load"
      description="The dashboard data didn’t come through cleanly. Give it another shot."
      onRetry={reset}
    />
  );
}
