"use client";

import { useMemo, useState } from "react";
import { ShoppingCart, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { GroceryItemRow } from "./grocery-item-row";
import { useGroceryItems, useClearCheckedItems } from "../queries";
import { GROCERY_CATEGORIES } from "@/features/grocery/constants";
import type { GroceryItem } from "@/lib/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useQuery } from "@tanstack/react-query";

function useProfileNames() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase.from("profiles").select("id, display_name");
      return Object.fromEntries((data ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]));
    },
    staleTime: 60_000 * 10,
  });
}

export function GroceryList() {
  const { data: items = [], isLoading } = useGroceryItems();
  const { data: profileNames = {} } = useProfileNames();
  const clearChecked = useClearCheckedItems();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const byCategory = useMemo(() => {
    const map = new Map<string, GroceryItem[]>();
    for (const cat of GROCERY_CATEGORIES) map.set(cat, []);
    for (const item of items) {
      const cat = item.category in Object.fromEntries(map) ? item.category : "Other";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    // Only return non-empty categories, in defined order
    return GROCERY_CATEGORIES.map((cat) => ({
      category: cat,
      items: map.get(cat) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [items]);

  const checkedCount = items.filter((i) => i.is_checked).length;
  const totalCount = items.length;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ShoppingCart className="size-12 text-muted-foreground/30" />
        <p className="mt-4 text-base font-medium text-muted-foreground">List is empty</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Type items above or tap the mic to add with your voice
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Progress */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between pb-2">
          <span className="text-xs text-muted-foreground">
            {checkedCount} / {totalCount} collected
          </span>
          {checkedCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => clearChecked.mutate()}
              disabled={clearChecked.isPending}
            >
              <CheckCheck className="size-3.5" />
              Clear checked
            </Button>
          )}
        </div>
      )}

      {/* Category sections */}
      <AnimatePresence initial={false}>
        {byCategory.map(({ category, items: catItems }) => {
          const isOpen = openSections[category] !== false; // default open
          const checkedInCat = catItems.filter((i) => i.is_checked).length;

          return (
            <Collapsible
              key={category}
              open={isOpen}
              onOpenChange={(v) =>
                setOpenSections((prev) => ({ ...prev, [category]: v }))
              }
            >
              <CollapsibleTrigger className="flex w-full items-center gap-2 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 rounded transition-colors cursor-pointer">
                <ChevronDown
                  className={`size-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                />
                {category}
                <span className="font-normal">
                  ({checkedInCat}/{catItems.length})
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <motion.div layout className="divide-y divide-border/50 pl-1">
                  <AnimatePresence mode="popLayout">
                    {catItems.map((item) => (
                      <GroceryItemRow
                        key={item.id}
                        item={item}
                        addedByName={item.added_by ? profileNames[item.added_by] : undefined}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
