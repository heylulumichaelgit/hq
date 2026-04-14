"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function GroceryError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Grocery list failed to load"
      description="The grocery screen hit an error. Retry should bring it back."
      onRetry={reset}
    />
  );
}
