"use client";

import { useConnectionStatus, useDisconnectGoogle } from "../queries";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, Unlink } from "lucide-react";

export function GoogleConnectBanner() {
  const { data: status, isLoading } = useConnectionStatus();
  const disconnect = useDisconnectGoogle();

  if (isLoading) return null;

  if (status?.connected) {
    return (
      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2 text-sm">
        <span className="text-muted-foreground">
          Connected as <span className="font-medium text-foreground">{status.googleEmail}</span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
          disabled={disconnect.isPending}
          onClick={() => disconnect.mutate()}
        >
          {disconnect.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Unlink className="h-3.5 w-3.5" />
          )}
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-dashed bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Connect Google Calendar</p>
          <p className="text-xs text-muted-foreground">
            See your work events alongside family events
          </p>
        </div>
      </div>
      <a href="/api/calendar/oauth/connect">
        <Button size="sm">Connect</Button>
      </a>
    </div>
  );
}
