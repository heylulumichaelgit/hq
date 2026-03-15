"use client";

import { useConnectionStatus, useDisconnectGoogle } from "../queries";
import { Button } from "@/components/ui/button";
import { CalendarDays, Loader2, Plus, Unlink } from "lucide-react";

export function GoogleConnectBanner() {
  const { data: status, isLoading } = useConnectionStatus();
  const disconnect = useDisconnectGoogle();

  if (isLoading) return null;

  const emails = status?.googleEmails ?? [];

  return (
    <div className="rounded-lg border bg-muted/30 px-4 py-3 space-y-2">
      {emails.length === 0 ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-sm font-medium">Connect Google Calendar</p>
              <p className="text-xs text-muted-foreground">
                See your events alongside family events
              </p>
            </div>
          </div>
          <a href="/api/calendar/oauth/connect">
            <Button size="sm" className="h-8 text-xs">Connect</Button>
          </a>
        </div>
      ) : (
        <>
          {emails.map((email) => (
            <div key={email} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-2 w-2 rounded-full bg-primary/70 shrink-0" />
                <span className="text-sm truncate">{email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs text-muted-foreground shrink-0"
                disabled={disconnect.isPending}
                onClick={() => disconnect.mutate(email)}
              >
                {disconnect.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Unlink className="h-3 w-3" />
                )}
                Remove
              </Button>
            </div>
          ))}

          <div className="pt-0.5">
            <a href="/api/calendar/oauth/connect">
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs w-full">
                <Plus className="h-3 w-3" />
                Connect another Google account
              </Button>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
