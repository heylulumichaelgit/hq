"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function MealsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Meals failed to load"
      description="Meal planning hit an error. Retry and it should recover."
      onRetry={reset}
    />
  );
}
