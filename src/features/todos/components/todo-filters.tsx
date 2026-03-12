"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTodoFilterStore } from "../store";
import { useSections } from "../queries";
import {
  Search,
  RotateCcw,
  ArrowUpDown,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ChipValue = string;

function FilterChip({
  label,
  value,
  isActive,
  onClick,
}: {
  label: string;
  value: ChipValue;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium transition-colors",
        "border cursor-pointer",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-foreground"
      )}
    >
      {label}
    </button>
  );
}

export function TodoFilters() {
  const { filters, setFilter, resetFilters } = useTodoFilterStore();
  const sections = useSections();

  const hasActiveFilters =
    filters.assignedTo !== "all" ||
    filters.priority !== "all" ||
    filters.completed !== "active" ||
    filters.search !== "" ||
    filters.section !== "all" ||
    filters.sortBy !== "created_at" ||
    filters.sortOrder !== "desc";

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder="Search todos..."
          className="pl-9 h-10"
        />
      </div>

      {/* Filter chips row */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />

        {/* Status chips */}
        <FilterChip
          label="Active"
          value="active"
          isActive={filters.completed === "active"}
          onClick={() =>
            setFilter("completed", filters.completed === "active" ? "all" : "active")
          }
        />
        <FilterChip
          label="Done"
          value="completed"
          isActive={filters.completed === "completed"}
          onClick={() =>
            setFilter(
              "completed",
              filters.completed === "completed" ? "all" : "completed"
            )
          }
        />

        <span className="h-4 w-px bg-border" />

        {/* Priority chips */}
        {(["high", "medium", "low"] as const).map((p) => (
          <FilterChip
            key={p}
            label={p === "high" ? "High" : p === "medium" ? "Med" : "Low"}
            value={p}
            isActive={filters.priority === p}
            onClick={() =>
              setFilter("priority", filters.priority === p ? "all" : p)
            }
          />
        ))}

        <span className="h-4 w-px bg-border" />

        {/* Person chips */}
        {(["Andrew", "Chrystalla", "Both", "Lulu"] as const).map((person) => (
          <FilterChip
            key={person}
            label={person}
            value={person}
            isActive={filters.assignedTo === person}
            onClick={() =>
              setFilter(
                "assignedTo",
                filters.assignedTo === person ? "all" : person
              )
            }
          />
        ))}

        {/* Section filter (only if sections exist) */}
        {sections.length > 0 && (
          <>
            <span className="h-4 w-px bg-border" />
            <Select
              value={filters.section}
              onValueChange={(v) => setFilter("section", v)}
            >
              <SelectTrigger className="h-7 w-auto gap-1 text-xs px-2 border rounded-full">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sections</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
                <SelectItem value="">Unsectioned</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}

        <span className="h-4 w-px bg-border" />

        {/* Sort */}
        <Select
          value={`${filters.sortBy}:${filters.sortOrder}`}
          onValueChange={(v) => {
            const [sortBy, sortOrder] = v.split(":") as [
              typeof filters.sortBy,
              typeof filters.sortOrder,
            ];
            setFilter("sortBy", sortBy);
            setFilter("sortOrder", sortOrder);
          }}
        >
          <SelectTrigger className="h-7 w-auto gap-1 text-xs px-2 border rounded-full">
            <ArrowUpDown className="h-3 w-3" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at:desc">Newest</SelectItem>
            <SelectItem value="created_at:asc">Oldest</SelectItem>
            <SelectItem value="due_date:asc">Due soonest</SelectItem>
            <SelectItem value="due_date:desc">Due latest</SelectItem>
            <SelectItem value="priority:desc">Priority high</SelectItem>
            <SelectItem value="priority:asc">Priority low</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset */}
        {hasActiveFilters && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={resetFilters}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset filters</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
}
