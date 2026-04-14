"use client";

import Link from "next/link";
import { CalendarPlus, CirclePlus, Receipt, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCommandStore } from "@/lib/command-store";

const actions = [
  {
    label: "Add task",
    icon: CirclePlus,
    kind: "todo" as const,
  },
  {
    label: "Add grocery",
    icon: ShoppingCart,
    href: "/grocery",
  },
  {
    label: "Plan meal",
    icon: UtensilsCrossed,
    href: "/meals",
  },
  {
    label: "Add event",
    icon: CalendarPlus,
    kind: "event" as const,
  },
  {
    label: "Log receipt",
    icon: Receipt,
    href: "/expenses",
  },
];

export function HomeActionCenter() {
  const { setTodoFormOpen, setEventFormOpen } = useCommandStore();

  const handleAction = (kind?: "todo" | "event") => {
    if (kind === "todo") setTodoFormOpen(true);
    if (kind === "event") setEventFormOpen(true);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Action center</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {actions.map((action) => {
          const content = (
            <>
              <action.icon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">{action.label}</span>
            </>
          );

          if (action.href) {
            return (
              <Button key={action.label} variant="outline" asChild className="h-auto justify-start gap-2 px-3 py-3">
                <Link href={action.href}>{content}</Link>
              </Button>
            );
          }

          return (
            <Button
              key={action.label}
              variant="outline"
              className="h-auto justify-start gap-2 px-3 py-3"
              onClick={() => handleAction(action.kind)}
            >
              {content}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
