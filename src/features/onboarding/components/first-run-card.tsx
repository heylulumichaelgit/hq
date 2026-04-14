"use client";

import Link from "next/link";
import { ArrowRight, Calendar, ShoppingCart, Users, UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useConnectionStatus } from "@/features/calendar/queries";
import { useAuthStore } from "@/features/auth/store";

function SetupItem({
  done,
  icon: Icon,
  title,
  description,
  href,
}: {
  done: boolean;
  icon: React.ElementType;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border p-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className={`mt-0.5 rounded-lg p-2 ${done ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button variant="ghost" size="sm" asChild className="shrink-0 gap-1">
        <Link href={href}>
          {done ? "Review" : "Set up"}
          <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}

export function FirstRunCard() {
  const { profile } = useAuthStore();
  const { data: connectionStatus } = useConnectionStatus();

  const hasName = Boolean(profile?.display_name && profile.display_name !== profile.email);
  const hasAvatar = Boolean(profile?.avatar_url);
  const hasGoogle = Boolean(connectionStatus?.connected);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Get HQ set up</CardTitle>
        <CardDescription>Start with the few things that make daily family life calmer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <SetupItem
          done={hasName || hasAvatar}
          icon={Users}
          title="Profile"
          description="Add your name and avatar so the family views feel personal."
          href="/services"
        />
        <SetupItem
          done={hasGoogle}
          icon={Calendar}
          title="Calendar"
          description="Connect Google Calendar to see the real family schedule."
          href="/calendar"
        />
        <SetupItem
          done={false}
          icon={ShoppingCart}
          title="Grocery rhythm"
          description="Use staples and quick grocery capture to reduce repeat effort."
          href="/grocery"
        />
        <SetupItem
          done={false}
          icon={UtensilsCrossed}
          title="Meal rhythm"
          description="Plan a week once so dinners stop being a daily negotiation."
          href="/meals"
        />
      </CardContent>
    </Card>
  );
}
