"use client";

import { useState } from "react";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useUpsertMeal, useDeleteMeal } from "../queries";
import type { MealPlan, UpsertMealPayload } from "../queries";

interface MealCellProps {
  weekStart: string;
  dayOfWeek: number;
  mealType: string;
  meal: MealPlan | undefined;
  createdBy?: string | null;
}

export function MealCell({
  weekStart,
  dayOfWeek,
  mealType,
  meal,
  createdBy,
}: MealCellProps) {
  const upsert = useUpsertMeal();
  const remove = useDeleteMeal();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(meal?.title ?? "");
  const [notes, setNotes] = useState(meal?.notes ?? "");
  const [recipeUrl, setRecipeUrl] = useState(meal?.recipe_url ?? "");

  const handleOpen = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(meal?.title ?? "");
      setNotes(meal?.notes ?? "");
      setRecipeUrl(meal?.recipe_url ?? "");
    }
    setOpen(isOpen);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    const payload: UpsertMealPayload = {
      week_start: weekStart,
      day_of_week: dayOfWeek,
      meal_type: mealType,
      title: title.trim(),
      notes: notes.trim() || null,
      recipe_url: recipeUrl.trim() || null,
      created_by: createdBy ?? null,
    };
    await upsert.mutateAsync(payload);
    setOpen(false);
  };

  const handleDelete = async () => {
    if (!meal) return;
    await remove.mutateAsync(meal.id);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSave();
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        {meal ? (
          <button
            className={cn(
              "w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors",
              "bg-primary/8 hover:bg-primary/15 border border-primary/15",
              "group relative min-h-[32px] flex items-start gap-1"
            )}
          >
            <span className="flex-1 truncate leading-snug font-medium text-foreground">
              {meal.title}
            </span>
            {meal.recipe_url && (
              <ExternalLink className="size-2.5 shrink-0 mt-0.5 text-muted-foreground" />
            )}
          </button>
        ) : (
          <button
            className={cn(
              "w-full rounded-md border border-dashed border-border/50 transition-colors",
              "hover:border-primary/40 hover:bg-primary/5",
              "flex items-center justify-center min-h-[32px] group"
            )}
          >
            <Plus className="size-3 text-muted-foreground/40 group-hover:text-primary/50 transition-colors" />
          </button>
        )}
      </PopoverTrigger>

      <PopoverContent className="w-72 p-3" align="start" onKeyDown={handleKeyDown}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold capitalize text-muted-foreground">
              {mealType}
            </p>
            {meal && (
              <Button
                variant="ghost"
                size="icon"
                className="size-6 text-muted-foreground hover:text-destructive"
                onClick={handleDelete}
                disabled={remove.isPending}
              >
                <Trash2 className="size-3" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Input
              placeholder="What's for dinner?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 text-sm"
              autoFocus
            />
            <Textarea
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[60px] resize-none"
            />
            <Input
              placeholder="Recipe URL (optional)"
              value={recipeUrl}
              onChange={(e) => setRecipeUrl(e.target.value)}
              className="h-8 text-sm"
              type="url"
            />
          </div>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleSave}
              disabled={!title.trim() || upsert.isPending}
            >
              {meal ? "Update" : "Add"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
          </div>
          {meal?.recipe_url && (
            <a
              href={meal.recipe_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="size-3" />
              View recipe
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
