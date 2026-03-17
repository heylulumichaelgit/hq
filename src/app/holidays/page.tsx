"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Plus, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { useHolidays } from "@/features/holidays/queries";
import { HolidayCard } from "@/features/holidays/components/holiday-card";
import { HolidayFormDialog } from "@/features/holidays/components/holiday-form-dialog";
import type { Holiday } from "@/features/holidays/queries";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.25, ease: "easeOut" as const },
  }),
};

function HolidayGrid({ holidays }: { holidays: Holiday[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <AnimatePresence mode="popLayout">
        {holidays.map((h, i) => (
          <motion.div
            key={h.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            layout
          >
            <HolidayCard holiday={h} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default function HolidaysPage() {
  const { setSlot } = useHeaderSlot();
  const { data: holidays, isLoading } = useHolidays();
  const [addOpen, setAddOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [cancelledOpen, setCancelledOpen] = useState(false);

  useEffect(() => {
    setSlot(
      <>
        <div className="flex items-center gap-2 shrink-0">
          <Plane className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Holidays</span>
        </div>
        <div className="flex-1" />
        <Button
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-3.5" />
          Add Trip
        </Button>
      </>
    );
    return () => setSlot(null);
  }, [setSlot]);

  const upcoming =
    holidays?.filter((h) => h.status === "planning" || h.status === "booked") ??
    [];
  const past = holidays?.filter((h) => h.status === "completed") ?? [];
  const cancelled = holidays?.filter((h) => h.status === "cancelled") ?? [];

  // Sort upcoming by start_date asc (nulls last)
  const sortedUpcoming = [...upcoming].sort((a, b) => {
    if (!a.start_date && !b.start_date) return 0;
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    return a.start_date.localeCompare(b.start_date);
  });

  const hasAny = upcoming.length + past.length + cancelled.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-8 pb-8"
      >
        {/* Empty state */}
        {!hasAny && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-muted/60">
              <Plane className="size-10 text-muted-foreground/40" />
            </div>
            <p className="mt-5 text-lg font-semibold">No trips yet</p>
            <p className="mt-1.5 text-sm text-muted-foreground max-w-xs">
              Start planning your next family adventure — add your first trip
              and track it from dream to done.
            </p>
            <Button
              className="mt-6 gap-2"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="size-4" />
              Add your first trip
            </Button>
          </div>
        )}

        {/* Upcoming section */}
        {sortedUpcoming.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
              Upcoming
            </h2>
            <HolidayGrid holidays={sortedUpcoming} />
          </section>
        )}

        {/* Past section — collapsible */}
        {past.length > 0 && (
          <Collapsible open={pastOpen} onOpenChange={setPastOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-0.5 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent/50 rounded transition-colors cursor-pointer">
              <motion.span
                animate={{ rotate: pastOpen ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                className="flex items-center"
              >
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </motion.span>
              <span className="text-muted-foreground">Past</span>
              <span className="font-normal text-muted-foreground/60">
                ({past.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3">
                <HolidayGrid holidays={past} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Cancelled section — collapsible, only if any */}
        {cancelled.length > 0 && (
          <Collapsible open={cancelledOpen} onOpenChange={setCancelledOpen}>
            <CollapsibleTrigger className="flex w-full items-center gap-2 px-0.5 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent/50 rounded transition-colors cursor-pointer">
              <motion.span
                animate={{ rotate: cancelledOpen ? 0 : -90 }}
                transition={{ duration: 0.2 }}
                className="flex items-center"
              >
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </motion.span>
              <span className="text-muted-foreground">Cancelled</span>
              <span className="font-normal text-muted-foreground/60">
                ({cancelled.length})
              </span>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-3">
                <HolidayGrid holidays={cancelled} />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </motion.div>

      <HolidayFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
