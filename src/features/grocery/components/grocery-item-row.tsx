"use client";

import { useState, useRef, useCallback } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToggleGroceryItem, useDeleteGroceryItem } from "../queries";
import type { GroceryItem } from "@/lib/supabase/types";
import { toast } from "sonner";

interface GroceryItemRowProps {
  item: GroceryItem;
  addedByName?: string;
}

export function GroceryItemRow({ item, addedByName }: GroceryItemRowProps) {
  const toggle = useToggleGroceryItem();
  const remove = useDeleteGroceryItem();
  const [hovered, setHovered] = useState(false);

  // Swipe-to-delete state
  const [swipeX, setSwipeX] = useState(0);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipingRef = useRef(false);
  const directionLockedRef = useRef(false);

  const SWIPE_THRESHOLD = 80;
  const LOCK_DISTANCE = 15;

  const onSwipeTouchStart = useCallback((e: React.TouchEvent) => {
    swipeStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    swipingRef.current = false;
    directionLockedRef.current = false;
  }, []);

  const onSwipeTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swipeStartRef.current) return;
    const dx = e.touches[0].clientX - swipeStartRef.current.x;
    const dy = e.touches[0].clientY - swipeStartRef.current.y;

    // Wait for enough movement to lock direction
    if (!directionLockedRef.current) {
      if (Math.abs(dx) < LOCK_DISTANCE && Math.abs(dy) < LOCK_DISTANCE) return;
      directionLockedRef.current = true;
      if (Math.abs(dy) >= Math.abs(dx) * 0.7) {
        swipeStartRef.current = null;
        return;
      }
    }

    // Only swipe left (negative dx)
    if (dx < -LOCK_DISTANCE) {
      swipingRef.current = true;
      e.preventDefault(); // prevent browser back-swipe and page movement
      const capped = Math.max(dx, -140);
      setSwipeX(capped);
    }
  }, []);

  const onSwipeTouchEnd = useCallback(() => {
    if (swipingRef.current && swipeX <= -SWIPE_THRESHOLD) {
      if (navigator.vibrate) navigator.vibrate(15);
      const itemId = item.id;
      const itemName = item.name;
      remove.mutate(itemId);
      toast("Item deleted", {
        description: itemName,
        action: {
          label: "Undo",
          onClick: () => {
            toggle.mutate({ id: itemId, is_checked: false });
          },
        },
        duration: 4000,
      });
    }
    setSwipeX(0);
    swipeStartRef.current = null;
    swipingRef.current = false;
    directionLockedRef.current = false;
  }, [swipeX, item, remove, toggle]);

  const quantityLabel =
    item.quantity != null
      ? `${item.quantity}${item.unit ? " " + item.unit : ""}`
      : item.unit ?? null;

  const swipeProgress = Math.min(Math.abs(swipeX) / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Swipe reveal background (delete) */}
      <div
        className="absolute inset-0 flex items-center justify-end pr-5 rounded-lg bg-destructive/15"
        style={{ opacity: Math.abs(swipeX) > 10 ? 1 : 0 }}
      >
        <Trash2
          className="h-5 w-5 text-destructive transition-transform"
          style={{
            transform: `scale(${swipeProgress})`,
            opacity: swipeProgress,
          }}
        />
      </div>

      <motion.div
        layout
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 8 }}
        className="relative flex items-center gap-3 py-2 group bg-background rounded-lg"
        style={{
          transform: swipeX < 0 ? `translateX(${swipeX}px)` : undefined,
          transition: swipeX < 0 ? "none" : "transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onTouchStart={onSwipeTouchStart}
        onTouchMove={onSwipeTouchMove}
        onTouchEnd={onSwipeTouchEnd}
      >
        <Checkbox
          checked={item.is_checked}
          onCheckedChange={(checked) =>
            toggle.mutate({ id: item.id, is_checked: !!checked })
          }
          className="shrink-0"
          aria-label={`Mark ${item.name} as ${item.is_checked ? "unchecked" : "checked"}`}
        />

        <div className="flex-1 min-w-0">
          <span
            className={cn(
              "text-sm transition-colors",
              item.is_checked && "line-through text-muted-foreground"
            )}
          >
            {item.name}
          </span>
          {quantityLabel && (
            <span className="ml-2 text-xs text-muted-foreground">{quantityLabel}</span>
          )}
        </div>

        {addedByName && (
          <Avatar className="size-5 shrink-0">
            <AvatarFallback className="text-[10px] bg-primary/15 text-primary font-semibold">
              {addedByName.charAt(0)}
            </AvatarFallback>
          </Avatar>
        )}

        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "size-7 shrink-0 text-muted-foreground hover:text-destructive transition-opacity",
            hovered || item.is_checked ? "opacity-100" : "opacity-0"
          )}
          onClick={() => remove.mutate(item.id)}
          aria-label="Delete item"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </motion.div>
    </div>
  );
}
