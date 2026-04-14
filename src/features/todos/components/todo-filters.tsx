"use client";

import { useState, useRef, useEffect } from "react";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useTodoFilterStore } from "../store";
import { useSections } from "../queries";
import { useLabels } from "@/features/labels/queries";
import {
  Search,
  RotateCcw,
  ArrowUpDown,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

function FilterChip({
  label,
  isActive,
  onClick,
  color,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors border cursor-pointer",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-muted-foreground border-input hover:bg-accent hover:text-foreground"
      )}
      style={
        color && isActive
          ? { backgroundColor: color + "30", borderColor: color + "80", color }
          : color
          ? { borderColor: color + "50", color }
          : undefined
      }
    >
      {color && (
        <span
          className="mr-1.5 h-1.5 w-1.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
      )}
      {label}
    </button>
  );
}

export function TodoFilters() {
  const { filters, setFilter, resetFilters } = useTodoFilterStore();
  const sections = useSections();
  const { data: labels = [] } = useLabels();
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const activeFilterCount = [
    filters.assignedTo !== "all",
    filters.priority !== "all",
    filters.completed !== "active",
    filters.section !== "all",
    filters.labelId !== null,
  ].filter(Boolean).length;

  const hasActiveFilters =
    activeFilterCount > 0 ||
    filters.search !== "" ||
    filters.sortBy !== "due_date" ||
    filters.sortOrder !== "asc";

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  return (
    <div className="flex items-center gap-2">
      {/* Search — icon-only on mobile, input on sm+ */}
      <div className="hidden sm:flex relative flex-1 min-w-0 max-w-40">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => setFilter("search", e.target.value)}
          placeholder="Search..."
          className="pl-8 h-8 text-xs"
        />
      </div>
      {/* Mobile: icon button → expands inline */}
      <div className="flex sm:hidden items-center">
        {searchOpen ? (
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={filters.search}
              onChange={(e) => setFilter("search", e.target.value)}
              placeholder="Search..."
              className="pl-8 h-8 text-xs w-36"
              onBlur={() => { if (!filters.search) setSearchOpen(false); }}
            />
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Filter button */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs shrink-0"
        onClick={() => setFilterSheetOpen(true)}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Filters</span>
        {activeFilterCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
            {activeFilterCount}
          </span>
        )}
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="hidden sm:inline-flex h-8 gap-1.5 text-xs shrink-0"
        onClick={() => setFilterSheetOpen(true)}
      >
        <ArrowUpDown className="h-3.5 w-3.5" />
        Sort
      </Button>

      {/* Reset */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-xs text-muted-foreground shrink-0"
          onClick={resetFilters}
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
      )}

      {/* Filter Sheet */}
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl px-5">
          <SheetHeader className="pb-2">
            <SheetTitle className="text-base">Filters</SheetTitle>
          </SheetHeader>

          <div className="space-y-5 pb-6">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sort</p>
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
                <SelectTrigger className="h-10 w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date:asc">Due soonest</SelectItem>
                  <SelectItem value="due_date:desc">Due latest</SelectItem>
                  <SelectItem value="created_at:desc">Newest</SelectItem>
                  <SelectItem value="created_at:asc">Oldest</SelectItem>
                  <SelectItem value="priority:desc">Priority ↑</SelectItem>
                  <SelectItem value="priority:asc">Priority ↓</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Status */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
              <div className="flex flex-wrap gap-2">
                <FilterChip
                  label="Active"
                  isActive={filters.completed === "active"}
                  onClick={() => setFilter("completed", filters.completed === "active" ? "all" : "active")}
                />
                <FilterChip
                  label="Done"
                  isActive={filters.completed === "completed"}
                  onClick={() => setFilter("completed", filters.completed === "completed" ? "all" : "completed")}
                />
                <FilterChip
                  label="All"
                  isActive={filters.completed === "all"}
                  onClick={() => setFilter("completed", "all")}
                />
              </div>
            </div>

            <Separator />

            {/* Priority */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</p>
              <div className="flex flex-wrap gap-2">
                {(["high", "medium", "low"] as const).map((p) => (
                  <FilterChip
                    key={p}
                    label={p.charAt(0).toUpperCase() + p.slice(1)}
                    isActive={filters.priority === p}
                    onClick={() => setFilter("priority", filters.priority === p ? "all" : p)}
                  />
                ))}
              </div>
            </div>

            <Separator />

            {/* Assignee */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignee</p>
              <div className="flex flex-wrap gap-2">
                {(["Andrew", "Chrystalla", "Lulu"] as const).map((person) => (
                  <FilterChip
                    key={person}
                    label={person}
                    isActive={filters.assignedTo === person}
                    onClick={() => setFilter("assignedTo", filters.assignedTo === person ? "all" : person)}
                  />
                ))}
              </div>
            </div>

            {/* Labels (if any) */}
            {labels.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Labels</p>
                  <div className="flex flex-wrap gap-2">
                    {labels.map((label) => (
                      <FilterChip
                        key={label.id}
                        label={label.name}
                        isActive={filters.labelId === label.id}
                        onClick={() => setFilter("labelId", filters.labelId === label.id ? null : label.id)}
                        color={label.color}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Section (if any) */}
            {sections.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Section</p>
                  <div className="flex flex-wrap gap-2">
                    <FilterChip
                      label="All"
                      isActive={filters.section === "all"}
                      onClick={() => setFilter("section", "all")}
                    />
                    {sections.map((s) => (
                      <FilterChip
                        key={s}
                        label={s}
                        isActive={filters.section === s}
                        onClick={() => setFilter("section", filters.section === s ? "all" : s)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
