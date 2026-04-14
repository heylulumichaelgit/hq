"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function ExpensesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Expenses failed to load"
      description="Expenses ran into an error. Retry should usually fix it."
      onRetry={reset}
    />
  );
}
