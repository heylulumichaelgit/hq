"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarView } from "@/features/calendar/components/calendar-view";
import { EventFormDialog } from "@/features/calendar/components/event-form-dialog";
import { CalendarSettingsSheet } from "@/features/calendar/components/calendar-settings-sheet";
import { Plus } from "lucide-react";

function OAuthRedirectHandler() {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams.get("connected") || searchParams.get("error")) {
      window.history.replaceState({}, "", "/calendar");
    }
  }, [searchParams]);
  return null;
}

export default function CalendarPage() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col h-full gap-3"
    >
      <Suspense>
        <OAuthRedirectHandler />
      </Suspense>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Calendar</h1>
        <div className="flex items-center gap-2">
          <CalendarSettingsSheet />
          <EventFormDialog
            trigger={
              <button className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Event</span>
              </button>
            }
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <CalendarView />
      </div>
    </motion.div>
  );
}
