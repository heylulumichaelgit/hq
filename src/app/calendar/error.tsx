"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function CalendarError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Calendar failed to load"
      description="Calendar data blew up somewhere. Retry and it should usually recover."
      onRetry={reset}
    />
  );
}
