"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import { GroceryInput, SuggestionBanner } from "@/features/grocery/components/grocery-input";
import { GroceryList } from "@/features/grocery/components/grocery-list";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { useAddGroceryItems } from "@/features/grocery/queries";
import { useAuthStore } from "@/features/auth/store";

export default function GroceryPage() {
  const { setSlot } = useHeaderSlot();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const addItems = useAddGroceryItems();
  const { user } = useAuthStore();

  useEffect(() => {
    setSlot(
      <div className="flex items-center gap-2">
        <ShoppingCart className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold">Grocery List</span>
      </div>
    );
    return () => setSlot(null);
  }, [setSlot]);

  const handleAcceptSuggestion = useCallback(async (name: string) => {
    setSuggestions((prev) => prev.filter((s) => s !== name));
    await addItems.mutateAsync([{
      name,
      category: "Other",
      quantity: null,
      unit: null,
      is_checked: false,
      added_by: user?.id ?? null,
      position: Math.floor(Date.now() / 1000),
    }]);
  }, [addItems, user]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <GroceryInput onSuggestionsReceived={setSuggestions} />

      <AnimatePresence>
        {suggestions.length > 0 && (
          <SuggestionBanner
            suggestions={suggestions}
            onAccept={handleAcceptSuggestion}
            onDismiss={() => setSuggestions([])}
          />
        )}
      </AnimatePresence>

      <GroceryList />
    </motion.div>
  );
}
