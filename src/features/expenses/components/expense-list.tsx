"use client";

import { useMemo, useState } from "react";
import { FileText, ExternalLink, Trash2, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useExpenses, useDeleteExpense } from "../queries";
import type { Expense } from "../queries";

const CATEGORY_COLORS: Record<string, string> = {
  "Office Supplies": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Travel: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Meals & Entertainment": "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  Utilities: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Software: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  Equipment: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "Professional Services": "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Other: "bg-muted text-muted-foreground",
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function formatMonthYear(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function getMonthKey(dateStr: string) {
  return dateStr.slice(0, 7); // "YYYY-MM"
}

function isImageUrl(url: string) {
  return /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i.test(url);
}

interface ExpenseRowProps {
  expense: Expense;
}

function ExpenseRow({ expense }: ExpenseRowProps) {
  const deleteExpense = useDeleteExpense();
  const categoryClass = CATEGORY_COLORS[expense.category] ?? CATEGORY_COLORS.Other;

  const hasReceipt = !!expense.receipt_url;
  const isImage = hasReceipt && isImageUrl(expense.receipt_url!);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      className="flex items-center gap-3 py-3 group"
    >
      {/* Receipt thumbnail or PDF icon */}
      <div className="shrink-0">
        {hasReceipt ? (
          <button
            type="button"
            onClick={() => window.open(expense.receipt_url!, "_blank")}
            className="size-10 rounded overflow-hidden border bg-muted flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
            title="Open receipt in Dropbox"
          >
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={expense.receipt_url!}
                alt="Receipt"
                className="size-10 object-cover"
              />
            ) : (
              <FileText className="size-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="size-10 rounded border bg-muted flex items-center justify-center">
            <Receipt className="size-4 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate">{expense.description}</span>
          {hasReceipt && (
            <ExternalLink
              className="size-3 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              onClick={() => window.open(expense.receipt_url!, "_blank")}
            />
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatDate(expense.date)}
          </span>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0 h-4 font-normal ${categoryClass}`}
          >
            {expense.category}
          </Badge>
        </div>
      </div>

      {/* Amount */}
      <div className="shrink-0 text-right">
        {expense.amount !== null ? (
          <span className="text-sm font-semibold tabular-nums">
            {expense.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              {expense.currency}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Delete */}
      <div className="shrink-0">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete expense?</AlertDialogTitle>
              <AlertDialogDescription>
                &ldquo;{expense.description}&rdquo; will be permanently deleted.
                The file in Dropbox will not be removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteExpense.mutate(expense.id)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
}

export function ExpenseList() {
  const { data: expenses = [], isLoading } = useExpenses();
  const [_openMonths] = useState<Record<string, boolean>>({});

  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; expenses: Expense[]; total: Record<string, number> }>();

    for (const expense of expenses) {
      const key = getMonthKey(expense.date);
      if (!map.has(key)) {
        map.set(key, {
          label: formatMonthYear(expense.date),
          expenses: [],
          total: {},
        });
      }
      const group = map.get(key)!;
      group.expenses.push(expense);

      if (expense.amount !== null) {
        const cur = expense.currency;
        group.total[cur] = (group.total[cur] ?? 0) + expense.amount;
      }
    }

    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [expenses]);

  if (isLoading) {
    return (
      <div className="space-y-3 pt-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Receipt className="size-12 text-muted-foreground/30" />
        <p className="mt-4 text-base font-medium text-muted-foreground">
          No expenses yet
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Capture a receipt above to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AnimatePresence initial={false}>
        {grouped.map(([monthKey, group]) => {
          const totalEntries = Object.entries(group.total);

          return (
            <motion.div
              key={monthKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-0"
            >
              {/* Month header */}
              <div className="flex items-center justify-between py-1.5 border-b mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </span>
                <div className="flex items-center gap-2">
                  {totalEntries.length > 0 ? (
                    totalEntries.map(([cur, total]) => (
                      <span
                        key={cur}
                        className="text-xs font-semibold tabular-nums"
                      >
                        {total.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        <span className="font-normal text-muted-foreground">
                          {cur}
                        </span>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {group.expenses.length} expense
                      {group.expenses.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Expense rows */}
              <div className="divide-y divide-border/50">
                <AnimatePresence mode="popLayout">
                  {group.expenses.map((expense) => (
                    <ExpenseRow key={expense.id} expense={expense} />
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
