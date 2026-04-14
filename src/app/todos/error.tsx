"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function TodosError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorFallback
      title="Todos failed to load"
      description="The task list hit an error. Retry and it should settle down."
      onRetry={reset}
    />
  );
}
