"use client";

import { useMemo } from "react";
import Link from "next/link";
import { formatDistanceToNow, parseISO } from "date-fns";
import {
  CheckCircle2,
  CalendarDays,
  ShoppingCart,
  Receipt,
  UtensilsCrossed,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTodos } from "@/features/todos/queries";
import { useGroceryItems } from "@/features/grocery/queries";
import { useMealPlans } from "@/features/meals/queries";
import { useExpenses } from "@/features/expenses/queries";
import { useCalendarStore } from "@/features/calendar/store";
import { useFamilyEvents } from "@/features/calendar/queries";

interface ActivityItem {
  id: string;
  title: string;
  detail: string;
  href: string;
  timestamp: string;
  type: "todo" | "grocery" | "meal" | "expense" | "calendar";
}

const typeMeta = {
  todo: { icon: CheckCircle2, label: "Task" },
  grocery: { icon: ShoppingCart, label: "Grocery" },
  meal: { icon: UtensilsCrossed, label: "Meal" },
  expense: { icon: Receipt, label: "Expense" },
  calendar: { icon: CalendarDays, label: "Calendar" },
} as const;

export function ActivityFeed() {
  const { data: todos = [] } = useTodos();
  const { data: groceries = [] } = useGroceryItems();
  const { data: expenses = [] } = useExpenses();
  const { weekStart } = useCalendarStore();
  const { data: meals = [] } = useMealPlans(weekStart.toISOString().slice(0, 10));
  const { data: familyEvents = [] } = useFamilyEvents(
    new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(),
    new Date().toISOString()
  );

  const items = useMemo<ActivityItem[]>(() => {
    const activity: ActivityItem[] = [
      ...todos.map((todo) => ({
        id: `todo-${todo.id}`,
        title: todo.title,
        detail: todo.is_completed ? "Task completed" : "Task updated",
        href: "/todos/today",
        timestamp: todo.updated_at ?? todo.created_at,
        type: "todo" as const,
      })),
      ...groceries.map((item) => ({
        id: `grocery-${item.id}`,
        title: item.name,
        detail: item.is_checked ? "Marked collected" : "Added to grocery list",
        href: "/grocery",
        timestamp: item.created_at,
        type: "grocery" as const,
      })),
      ...meals.map((meal) => ({
        id: `meal-${meal.id}`,
        title: meal.title,
        detail: `Planned for ${meal.meal_type}`,
        href: "/meals",
        timestamp: meal.updated_at,
        type: "meal" as const,
      })),
      ...expenses.map((expense) => ({
        id: `expense-${expense.id}`,
        title: expense.description,
        detail: `Expense saved${expense.amount != null ? ` · ${expense.amount} ${expense.currency}` : ""}`,
        href: "/expenses",
        timestamp: expense.created_at,
        type: "expense" as const,
      })),
      ...familyEvents.map((event) => ({
        id: `calendar-${event.id}`,
        title: event.title,
        detail: "Family event added",
        href: "/calendar",
        timestamp: event.created_at,
        type: "calendar" as const,
      })),
    ];

    return activity
      .filter((item) => !!item.timestamp)
      .sort((a, b) => parseISO(b.timestamp).getTime() - parseISO(a.timestamp).getTime())
      .slice(0, 8);
  }, [expenses, familyEvents, groceries, meals, todos]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
          <Link
            href="/todos/today"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
          >
            Open app <ChevronRight className="size-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {items.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No recent activity yet.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {items.map((item) => {
              const meta = typeMeta[item.type];
              const Icon = meta.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center gap-3 py-3 transition-colors hover:bg-accent/30"
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      <Badge variant="outline" className="h-5 text-[10px]">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {item.detail} · {formatDistanceToNow(parseISO(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
