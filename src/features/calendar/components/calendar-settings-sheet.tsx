"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings2 } from "lucide-react";
import { useCalendarSelections, useUpdateSelection } from "../queries";

export function CalendarSettingsSheet() {
  const { data: selections, isLoading } = useCalendarSelections();
  const update = useUpdateSelection();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="min-h-[48px] min-w-[48px]">
          <Settings2 className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Calendar Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading calendars…</p>
          )}

          {!isLoading && (!selections || selections.length === 0) && (
            <p className="text-sm text-muted-foreground">
              Connect Google Calendar to manage settings.
            </p>
          )}

          {selections && selections.length > 0 && (
            <>
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Show in family view
                </p>
                {selections.map((sel) => (
                  <div key={sel.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ background: sel.color ?? "#6b7280" }}
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        {sel.calendar_name}
                      </Label>
                    </div>
                    <Switch
                      checked={sel.show_in_family_view}
                      onCheckedChange={(checked) =>
                        update.mutate({
                          calendar_id: sel.calendar_id,
                          show_in_family_view: checked,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Work calendars
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Family events will add a busy block to these calendars.
                  </p>
                </div>
                {selections.map((sel) => (
                  <div key={sel.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ background: sel.color ?? "#6b7280" }}
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        {sel.calendar_name}
                      </Label>
                    </div>
                    <Switch
                      checked={sel.is_work_calendar}
                      onCheckedChange={(checked) =>
                        update.mutate({
                          calendar_id: sel.calendar_id,
                          is_work_calendar: checked,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
