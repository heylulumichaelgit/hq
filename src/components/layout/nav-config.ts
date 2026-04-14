import {
  House,
  Star,
  ShoppingCart,
  Calendar,
  UtensilsCrossed,
  Inbox,
  Plane,
  Receipt,
  Settings2,
  BarChart2,
  CheckSquare,
} from "lucide-react";

export const primaryNav = [
  { href: "/", label: "Home", icon: House },
  { href: "/todos/today", label: "Today", icon: Star },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
] as const;

export const planningNav = [
  { href: "/todos", label: "Inbox", icon: Inbox },
  { href: "/holidays", label: "Holidays", icon: Plane },
  { href: "/expenses", label: "Expenses", icon: Receipt },
] as const;

export const utilityNav = [
  { href: "/todos/stats", label: "Stats", icon: BarChart2 },
  { href: "/services", label: "Settings", icon: Settings2 },
  { href: "/todos/completed", label: "Completed", icon: CheckSquare },
] as const;

export const mobileTabs = primaryNav;
