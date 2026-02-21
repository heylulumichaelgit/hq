"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTodoFilterStore } from "../store";
import { RotateCcw } from "lucide-react";

export function TodoFilters() {
  const { filters, setFilter, resetFilters } = useTodoFilterStore();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={filters.assignedTo}
        onValueChange={(v) => setFilter("assignedTo", v as typeof filters.assignedTo)}
      >
        <SelectTrigger className="w-[140px] min-h-[48px]">
          <SelectValue placeholder="Assigned to" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Everyone</SelectItem>
          <SelectItem value="Andrew">Andrew</SelectItem>
          <SelectItem value="Chrystalla">Chrystalla</SelectItem>
          <SelectItem value="Both">Both</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(v) => setFilter("priority", v as typeof filters.priority)}
      >
        <SelectTrigger className="w-[130px] min-h-[48px]">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priority</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={filters.completed}
        onValueChange={(v) => setFilter("completed", v as typeof filters.completed)}
      >
        <SelectTrigger className="w-[130px] min-h-[48px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="completed">Completed</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={`${filters.sortBy}:${filters.sortOrder}`}
        onValueChange={(v) => {
          const [sortBy, sortOrder] = v.split(":") as [
            typeof filters.sortBy,
            typeof filters.sortOrder
          ];
          setFilter("sortBy", sortBy);
          setFilter("sortOrder", sortOrder);
        }}
      >
        <SelectTrigger className="w-[160px] min-h-[48px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="created_at:desc">Newest First</SelectItem>
          <SelectItem value="created_at:asc">Oldest First</SelectItem>
          <SelectItem value="due_date:asc">Due Date (Soonest)</SelectItem>
          <SelectItem value="due_date:desc">Due Date (Latest)</SelectItem>
          <SelectItem value="priority:desc">Priority (High)</SelectItem>
          <SelectItem value="priority:asc">Priority (Low)</SelectItem>
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="icon"
        className="min-h-[48px] min-w-[48px]"
        onClick={resetFilters}
        title="Reset filters"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
