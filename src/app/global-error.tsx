"use client";

import { ErrorFallback } from "@/components/error-fallback";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <ErrorFallback
          title="HQ hit a wall"
          description="A full-app error happened. Try reloading the screen."
          onRetry={reset}
          showHome={false}
        />
      </body>
    </html>
  );
}
