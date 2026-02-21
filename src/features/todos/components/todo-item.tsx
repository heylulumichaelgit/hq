"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToggleTodo, useDeleteTodo } from "../queries";
import { TodoFormDialog } from "./todo-form-dialog";
import type { Todo } from "@/lib/supabase/types";
import { MoreVertical, Pencil, Trash2, Calendar, User } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const priorityConfig = {
  high: { label: "High", className: "bg-red-500/20 text-red-400 border-red-500/30" },
  medium: {
    label: "Med",
    className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  },
  low: { label: "Low", className: "bg-green-500/20 text-green-400 border-green-500/30" },
};

export function TodoItem({ todo }: { todo: Todo }) {
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();

  const priority = priorityConfig[todo.priority];
  const isOverdue =
    todo.due_date && !todo.is_completed && isPast(new Date(todo.due_date)) && !isToday(new Date(todo.due_date));

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        "group flex items-start gap-3 rounded-lg border p-4 transition-colors",
        todo.is_completed && "opacity-60"
      )}
    >
      <Checkbox
        checked={todo.is_completed}
        onCheckedChange={(checked) =>
          toggleTodo.mutate({ id: todo.id, is_completed: !!checked })
        }
        className="mt-0.5 h-6 w-6 rounded-md"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span
            className={cn(
              "text-sm font-medium leading-tight",
              todo.is_completed && "line-through text-muted-foreground"
            )}
          >
            {todo.title}
          </span>
          <Badge variant="outline" className={cn("text-xs shrink-0", priority.className)}>
            {priority.label}
          </Badge>
        </div>

        {todo.description && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {todo.description}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {todo.assigned_to}
          </span>
          {todo.due_date && (
            <span
              className={cn(
                "flex items-center gap-1",
                isOverdue && "text-destructive font-medium"
              )}
            >
              <Calendar className="h-3 w-3" />
              {format(new Date(todo.due_date), "MMM d")}
              {isOverdue && " (overdue)"}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[48px] min-w-[48px] shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <TodoFormDialog
            todo={todo}
            trigger={
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            }
          />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => deleteTodo.mutate(todo.id)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </motion.div>
  );
}
