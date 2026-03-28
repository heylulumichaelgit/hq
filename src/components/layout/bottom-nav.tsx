"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Star, Calendar, Menu, House } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";

const tabs = [
  { href: "/", label: "Home", icon: House, exact: true },
  { href: "/todos/today", label: "Today", icon: Star, exact: false },
  { href: "/calendar", label: "Calendar", icon: Calendar, exact: false },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex items-stretch">
        {tabs.map((tab) => {
          const isActive = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors min-h-[64px]",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon
                className={cn("h-5 w-5 transition-all", isActive && "scale-110")}
                strokeWidth={isActive ? 2.5 : 1.75}
              />
              {tab.label}
            </Link>
          );
        })}
        <button
          onClick={toggleSidebar}
          className="flex flex-1 flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors min-h-[64px]"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
          Menu
        </button>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
