"use client";

import { useMemo, useState } from "react";
import { Repeat, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/features/auth/store";
import {
  useAddStaplesToGrocery,
  useCreateGroceryStaple,
  useDeleteGroceryStaple,
  useGroceryItems,
  useGroceryStaples,
} from "../queries";

export function GroceryStaplesPanel() {
  const { data: staples = [] } = useGroceryStaples();
  const { data: groceryItems = [] } = useGroceryItems();
  const createStaple = useCreateGroceryStaple();
  const deleteStaple = useDeleteGroceryStaple();
  const addStaples = useAddStaplesToGrocery();
  const { profile } = useAuthStore();
  const [open, setOpen] = useState(false);

  const uncheckedItems = useMemo(
    () => groceryItems.filter((item) => !item.is_checked),
    [groceryItems]
  );

  const canSaveStaples = uncheckedItems.length > 0;

  const handleSaveCurrentAsStaples = async () => {
    for (const item of uncheckedItems) {
      await createStaple.mutateAsync({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        added_by: profile?.id ?? item.added_by ?? null,
      });
    }
  };

  const handleAddStaples = async () => {
    if (!staples.length) return;
    await addStaples.mutateAsync({ staples, addedBy: profile?.id ?? null });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Repeat className="size-3.5" />
          Staples
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">Recurring staples</p>
          <p className="text-xs text-muted-foreground">
            Save your usual weekly items and add them back in one tap.
          </p>
        </div>

        <DropdownMenuItem
          onClick={handleAddStaples}
          disabled={!staples.length || addStaples.isPending}
        >
          <Plus className="size-4" />
          Add all staples to list
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleSaveCurrentAsStaples}
          disabled={!canSaveStaples || createStaple.isPending}
        >
          <Repeat className="size-4" />
          Save current unchecked items as staples
        </DropdownMenuItem>

        {staples.length > 0 ? (
          <div className="max-h-64 overflow-y-auto px-1 py-1">
            {staples.map((staple) => (
              <div
                key={staple.id}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate">{staple.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {staple.category}
                    {staple.quantity != null && ` · ${staple.quantity}${staple.unit ? ` ${staple.unit}` : ""}`}
                  </p>
                </div>
                <button
                  className="text-muted-foreground hover:text-destructive"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await deleteStaple.mutateAsync(staple.id);
                  }}
                  aria-label={`Delete ${staple.name} staple`}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            No staples saved yet.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
