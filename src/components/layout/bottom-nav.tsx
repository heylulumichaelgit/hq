"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/components/ui/sidebar";
import { mobileTabs } from "./nav-config";

export function BottomNav() {
  const pathname = usePathname();
  const { toggleSidebar } = useSidebar();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="flex items-stretch">
        {mobileTabs.map((tab) => {
          const isActive = tab.href === "/"
            ? pathname === "/"
            : pathname === tab.href || pathname.startsWith(tab.href + "/");
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
