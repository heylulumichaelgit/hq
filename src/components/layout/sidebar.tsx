"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CheckSquare,
  ShoppingCart,
  Calendar,
  Plane,
  Home,
  LogOut,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/store";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { PushToggle } from "@/features/notifications/push-toggle";

const navItems = [
  { href: "/todos", label: "Todos", icon: CheckSquare, ready: true },
  { href: "/grocery", label: "Grocery List", icon: ShoppingCart, ready: false },
  { href: "/calendar", label: "Calendar", icon: Calendar, ready: false },
  { href: "/bookings", label: "Bookings", icon: Plane, ready: false },
];

export function Sidebar() {
  const pathname = usePathname();
  const { profile, reset } = useAuthStore();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    setMobileOpen(false);
    reset();
    // Fire and forget — don't let a broken session block logout
    const supabase = createClient();
    supabase.auth.signOut().catch(() => {});
    // Clear Supabase cookies manually in case signOut hangs
    document.cookie.split(";").forEach((c) => {
      const name = c.trim().split("=")[0];
      if (name.startsWith("sb-")) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    });
    window.location.href = "/login";
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          M
        </div>
        <div>
          <h1 className="text-lg font-bold">Michael Family</h1>
          <p className="text-xs text-muted-foreground">Family Hub</p>
        </div>
      </div>

      <Separator />

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.ready ? item.href : "#"}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors min-h-[48px]",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                !item.ready && "opacity-50 cursor-not-allowed"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
              {!item.ready && (
                <span className="ml-auto text-xs opacity-70">Soon</span>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator />

      <div className="p-3 space-y-2">
        {profile && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-bold">
              {profile.display_name.charAt(0)}
            </div>
            <span className="text-sm font-medium truncate flex-1">
              {profile.display_name}
            </span>
            <PushToggle />
          </div>
        )}

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[48px]"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </Button>

        <Button
          variant="ghost"
          className="w-full justify-start gap-3 min-h-[48px] text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 border-b bg-background px-4 py-3 md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="min-h-[48px] min-w-[48px]"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
        <Home className="h-5 w-5" />
        <span className="font-bold">Michael Family</span>
      </div>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 z-50 h-full w-[280px] border-r bg-background md:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-[260px] md:shrink-0 md:flex-col md:border-r md:bg-background h-screen sticky top-0">
        {sidebarContent}
      </aside>
    </>
  );
}
