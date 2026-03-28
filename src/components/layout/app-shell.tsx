"use client";

import type { ReactNode } from "react";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppSidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { Loader2 } from "lucide-react";
import { HeaderSlotProvider, useHeaderSlot } from "./header-slot-context";
import { CommandPalette } from "@/components/command-palette";
import { useCommandStore } from "@/lib/command-store";
import { TodoFormDialog } from "@/features/todos/components/todo-form-dialog";
import { EventFormDialog } from "@/features/calendar/components/event-form-dialog";
import { InstallPrompt } from "@/components/install-prompt";
import { RouteProgress } from "@/components/route-progress";

function SiteHeader() {
  const { slot } = useHeaderSlot();
  return (
    <header className="flex h-12 shrink-0 items-center border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-3 px-4 min-w-0">
        <SidebarTrigger className="-ml-1 shrink-0" />
        {slot && <div className="flex flex-1 items-center gap-3 min-w-0">{slot}</div>}
      </div>
    </header>
  );
}

function GlobalForms() {
  const { todoFormOpen, setTodoFormOpen, eventFormOpen, setEventFormOpen } =
    useCommandStore();
  return (
    <>
      <TodoFormDialog
        open={todoFormOpen}
        onOpenChange={setTodoFormOpen}
      />
      <EventFormDialog
        open={eventFormOpen}
        onOpenChange={setEventFormOpen}
      />
    </>
  );
}

function PullToRefreshIndicator({
  pullDistance,
  refreshing,
}: {
  pullDistance: number;
  refreshing: boolean;
}) {
  const progress = Math.min(pullDistance / 80, 1);
  const visible = pullDistance > 4 || refreshing;

  if (!visible) return null;

  return (
    <div
      className="absolute top-0 left-0 right-0 z-50 flex justify-center pointer-events-none md:hidden"
      style={{
        transform: `translateY(${refreshing ? 8 : Math.max(pullDistance * 0.3 - 8, 0)}px)`,
        opacity: refreshing ? 1 : progress,
        transition: refreshing ? "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)" : undefined,
      }}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background border shadow-sm">
        <Loader2
          className="h-4 w-4 text-muted-foreground"
          style={{
            animation: refreshing ? "spin 0.8s linear infinite" : undefined,
            transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
          }}
        />
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.refetchQueries({ type: "active" });
  }, [queryClient]);

  const { pullDistance, refreshing } = usePullToRefresh(handleRefresh);

  return (
    <HeaderSlotProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 64)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <PullToRefreshIndicator pullDistance={pullDistance} refreshing={refreshing} />
            <main
              className="flex flex-1 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0"
              style={{
                transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
                transition: pullDistance > 0 ? "none" : "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
              }}
            >
              <div className="mx-auto max-w-4xl w-full p-4 md:p-6">{children}</div>
            </main>
          </div>
        </SidebarInset>
        <BottomNav />
      </SidebarProvider>
      <RouteProgress />
      <CommandPalette />
      <GlobalForms />
      <InstallPrompt />
    </HeaderSlotProvider>
  );
}
