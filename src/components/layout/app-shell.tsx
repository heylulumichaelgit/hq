"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const PAGE_TITLES: Record<string, string> = {
  "/todos": "Inbox",
  "/todos/today": "Today",
  "/todos/upcoming": "Upcoming",
  "/todos/completed": "Completed",
  "/todos/stats": "Stats",
  "/calendar": "Calendar",
  "/grocery": "Grocery List",
  "/bookings": "Bookings",
};

function SiteHeader() {
  const pathname = usePathname();
  const title =
    PAGE_TITLES[pathname] ??
    (pathname.startsWith("/todos/project/") ? "Project" : "HQ");

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-sm font-medium">{title}</h1>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
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
        <main className="flex flex-1 flex-col pb-[calc(56px+env(safe-area-inset-bottom))] md:pb-0">
          <div className="mx-auto max-w-4xl w-full p-4 md:p-6">{children}</div>
        </main>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}
