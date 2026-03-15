"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings2, Loader2, Unlink, Plus } from "lucide-react";
import {
  useCalendarSelections,
  useUpdateSelection,
  useConnectionStatus,
  useDisconnectGoogle,
} from "../queries";

function CalendarRow({
  name,
  color,
  checked,
  onChange,
}: {
  name: string;
  color: string | null;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ background: color ?? "#6b7280" }}
        />
        <span className="text-sm truncate">{name}</span>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0 scale-90" />
    </div>
  );
}

function ConnectSection() {
  const { data: status, isLoading } = useConnectionStatus();
  const disconnect = useDisconnectGoogle();

  if (isLoading) return null;

  const emails = status?.googleEmails ?? [];

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Google Accounts
      </p>

      {emails.length === 0 ? (
        <a href="/api/calendar/oauth/connect">
          <Button size="sm" className="w-full h-8 text-xs">
            Connect Google Calendar
          </Button>
        </a>
      ) : (
        <div className="space-y-1.5">
          {emails.map((email) => (
            <div key={email} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                <span className="text-xs truncate">{email}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 text-xs text-muted-foreground shrink-0 px-2"
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
          <a href="/api/calendar/oauth/connect">
            <Button variant="outline" size="sm" className="w-full h-7 gap-1.5 text-xs mt-1">
              <Plus className="h-3 w-3" />
              Connect another account
            </Button>
          </a>
        </div>
      )}
    </div>
  );
}

export function CalendarSettingsSheet() {
  const { data: selections, isLoading } = useCalendarSelections();
  const update = useUpdateSelection();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile — bottom sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 md:hidden">
            <Settings2 className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-y-auto px-5">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-sm">Calendar Settings</SheetTitle>
          </SheetHeader>
          <SettingsBody selections={selections} isLoading={isLoading} update={update} />
        </SheetContent>
      </Sheet>

      {/* Desktop — right sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="h-9 w-9 hidden md:flex">
            <Settings2 className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0 overflow-y-auto">
          <SheetHeader className="px-5 py-3 border-b">
            <SheetTitle className="text-sm">Calendar Settings</SheetTitle>
          </SheetHeader>
          <div className="px-5 py-4">
            <SettingsBody selections={selections} isLoading={isLoading} update={update} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function SettingsBody({
  selections,
  isLoading,
  update,
}: {
  selections: ReturnType<typeof useCalendarSelections>["data"];
  isLoading: boolean;
  update: ReturnType<typeof useUpdateSelection>;
}) {
  return (
    <div className="space-y-4 pb-8">
      <ConnectSection />

      {!isLoading && selections && selections.length > 0 && (
        <>
          <Separator />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Show in family view
            </p>
            <div className="divide-y divide-border/50">
              {selections.map((sel) => (
                <CalendarRow
                  key={sel.id}
                  name={sel.calendar_name}
                  color={sel.color}
                  checked={sel.show_in_family_view}
                  onChange={(checked) =>
                    update.mutate({ calendar_id: sel.calendar_id, show_in_family_view: checked })
                  }
                />
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
              Work calendars
            </p>
            <p className="text-[10px] text-muted-foreground mb-2">
              Family events block these calendars.
            </p>
            <div className="divide-y divide-border/50">
              {selections.map((sel) => (
                <CalendarRow
                  key={sel.id}
                  name={sel.calendar_name}
                  color={sel.color}
                  checked={sel.is_work_calendar}
                  onChange={(checked) =>
                    update.mutate({ calendar_id: sel.calendar_id, is_work_calendar: checked })
                  }
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
