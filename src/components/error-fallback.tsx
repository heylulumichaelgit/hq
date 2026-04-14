"use client";

import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ErrorFallback({
  title = "Something broke",
  description = "The page hit an error. Try again, or head back home.",
  onRetry,
  showHome = true,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  showHome?: boolean;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="size-5" />
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex items-center justify-center gap-2">
            {onRetry && (
              <Button onClick={onRetry} className="gap-2">
                <RefreshCw className="size-4" />
                Try again
              </Button>
            )}
            {showHome && (
              <Button asChild variant="outline" className="gap-2">
                <Link href="/">
                  <Home className="size-4" />
                  Home
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
