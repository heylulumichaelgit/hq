"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useToggleGroceryItem, useDeleteGroceryItem } from "../queries";
import type { GroceryItem } from "@/lib/supabase/types";

interface GroceryItemRowProps {
  item: GroceryItem;
  addedByName?: string;
}

export function GroceryItemRow({ item, addedByName }: GroceryItemRowProps) {
  const toggle = useToggleGroceryItem();
  const remove = useDeleteGroceryItem();
  const [hovered, setHovered] = useState(false);

  const quantityLabel =
    item.quantity != null
      ? `${item.quantity}${item.unit ? " " + item.unit : ""}`
      : item.unit ?? null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      className="flex items-center gap-3 py-2 group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
  );
}
