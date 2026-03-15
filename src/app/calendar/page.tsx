"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarView } from "@/features/calendar/components/calendar-view";
import { EventFormDialog } from "@/features/calendar/components/event-form-dialog";
import { GoogleConnectBanner } from "@/features/calendar/components/google-connect-banner";
import { CalendarSettingsSheet } from "@/features/calendar/components/calendar-settings-sheet";

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
      className="flex flex-col h-full gap-4"
    >
      <Suspense>
        <OAuthRedirectHandler />
      </Suspense>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Family Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Shared view for the Michael family
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarSettingsSheet />
          <EventFormDialog />
        </div>
      </div>

      <GoogleConnectBanner />

      <div className="flex-1 min-h-0">
        <CalendarView />
      </div>
    </motion.div>
  );
}
