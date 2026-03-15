"use client";

import { useLabels, useAddLabelToTodo, useRemoveLabelFromTodo } from "@/features/labels/queries";
import type { Label } from "@/lib/supabase/types";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Tag, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface LabelPickerProps {
  todoId: string;
  currentLabels: Label[];
}

export function LabelPicker({ todoId, currentLabels }: LabelPickerProps) {
  const { data: allLabels = [] } = useLabels();
  const addLabel = useAddLabelToTodo();
  const removeLabel = useRemoveLabelFromTodo();

  const currentIds = new Set(currentLabels.map((l) => l.id));

  const toggle = (label: Label) => {
    if (currentIds.has(label.id)) {
      removeLabel.mutate({ todoId, labelId: label.id });
    } else {
      addLabel.mutate({ todoId, labelId: label.id });
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <Tag className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="end">
        <p className="text-xs text-muted-foreground px-2 py-1 font-medium">Labels</p>
        {allLabels.map((label) => {
          const active = currentIds.has(label.id);
          return (
            <button
              key={label.id}
              onClick={() => toggle(label)}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                "hover:bg-accent"
              )}
            >
              <span
                className="h-2.5 w-2.5 rounded-full shrink-0"
                style={{ backgroundColor: label.color }}
              />
              <span className="flex-1 text-left">{label.name}</span>
              {active && <Check className="h-3 w-3 text-primary" />}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
