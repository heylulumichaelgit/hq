"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToggleTodo, useDeleteTodo, getSubtaskProgress } from "../queries";
import { TodoFormDialog } from "./todo-form-dialog";
import type { Todo } from "@/lib/supabase/types";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  User,
  Plus,
  ListTree,
} from "lucide-react";
import {
  format,
  isPast,
  isToday,
  isTomorrow,
  startOfDay,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { InlineQuickAdd } from "./inline-quick-add";

const priorityColors = {
  high: {
    border: "border-red-500",
    fill: "bg-red-500",
    text: "text-red-500",
    ring: "ring-red-500/30",
  },
  medium: {
    border: "border-orange-400",
    fill: "bg-orange-400",
    text: "text-orange-400",
    ring: "ring-orange-400/30",
  },
  low: {
    border: "border-muted-foreground/40",
    fill: "bg-muted-foreground/40",
    text: "text-muted-foreground",
    ring: "ring-muted-foreground/20",
  },
};

function CircularCheckbox({
  checked,
  priority,
  onChange,
}: {
  checked: boolean;
  priority: "high" | "medium" | "low";
  onChange: (checked: boolean) => void;
}) {
  const colors = priorityColors[priority];

  return (
    <button
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200",
        "hover:ring-4 focus-visible:ring-4 focus-visible:outline-none",
        colors.ring,
        checked ? cn(colors.fill, "border-transparent") : colors.border
      )}
    >
      <AnimatePresence>
        {checked && (
          <motion.svg
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className="text-white"
          >
            <motion.path
              d="M2 6L5 9L10 3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.2, delay: 0.1 }}
            />
          </motion.svg>
        )}
      </AnimatePresence>
    </button>
  );
}

function formatDueDate(dateStr: string): {
  label: string;
  className: string;
} {
  const date = startOfDay(new Date(dateStr));
  const today = startOfDay(new Date());

  if (isToday(date)) {
    return { label: "Today", className: "text-blue-500 font-medium" };
  }
  if (isTomorrow(date)) {
    return { label: "Tomorrow", className: "text-orange-500 font-medium" };
  }
  if (isPast(date) && !isToday(date)) {
    return {
      label: format(date, "MMM d"),
      className: "text-destructive font-medium",
    };
  }
  return { label: format(date, "MMM d"), className: "text-muted-foreground" };
}

interface TodoItemProps {
  todo: Todo;
  allTodos: Todo[];
  isSubtask?: boolean;
}

export function TodoItem({ todo, allTodos, isSubtask = false }: TodoItemProps) {
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();
  const [showSubtaskAdd, setShowSubtaskAdd] = useState(false);

  const subtasks = allTodos.filter((t) => t.parent_id === todo.id);
  const hasSubtasks = subtasks.length > 0;
  const progress = hasSubtasks
    ? getSubtaskProgress(allTodos, todo.id)
    : null;

  const isOverdue =
    todo.due_date &&
    !todo.is_completed &&
    isPast(startOfDay(new Date(todo.due_date))) &&
    !isToday(new Date(todo.due_date));

  const dueDateInfo = todo.due_date ? formatDueDate(todo.due_date) : null;

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{
          opacity: todo.is_completed ? 0.5 : 1,
          y: 0,
        }}
        exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
        transition={{ type: "spring", stiffness: 500, damping: 40 }}
        className={cn(
          "group flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent/50",
          isSubtask && "ml-8 border-dashed",
          todo.is_completed && "bg-muted/30"
        )}
      >
        <CircularCheckbox
          checked={todo.is_completed}
          priority={todo.priority}
          onChange={(checked) =>
            toggleTodo.mutate({ id: todo.id, is_completed: checked })
          }
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <motion.span
              animate={{
                textDecoration: todo.is_completed ? "line-through" : "none",
              }}
              className={cn(
                "text-sm font-medium leading-snug",
                todo.is_completed && "text-muted-foreground"
              )}
            >
              {todo.title}
            </motion.span>
          </div>

          {todo.description && !todo.is_completed && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
              {todo.description}
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            {dueDateInfo && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  isOverdue ? "text-destructive font-medium" : dueDateInfo.className
                )}
              >
                <Calendar className="h-3 w-3" />
                {isOverdue ? `${dueDateInfo.label} (overdue)` : dueDateInfo.label}
              </span>
            )}

            <span className="flex items-center gap-1 text-muted-foreground">
              <User className="h-3 w-3" />
              {todo.assigned_to}
            </span>

            {todo.section && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                {todo.section}
              </Badge>
            )}

            {progress && progress.total > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <ListTree className="h-3 w-3" />
                {progress.completed}/{progress.total}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center shrink-0">
          {!isSubtask && !todo.is_completed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  onClick={() => setShowSubtaskAdd(!showSubtaskAdd)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Add subtask</TooltipContent>
            </Tooltip>
          )}

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
        </div>
      </motion.div>

      {/* Subtask inline add */}
      <AnimatePresence>
        {showSubtaskAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-8"
          >
            <InlineQuickAdd
              parentId={todo.id}
              defaultAssignedTo={todo.assigned_to}
              defaultPriority={todo.priority}
              onDone={() => setShowSubtaskAdd(false)}
              placeholder="Add subtask..."
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Render subtasks */}
      <AnimatePresence>
        {subtasks.map((sub) => (
          <TodoItem key={sub.id} todo={sub} allTodos={allTodos} isSubtask />
        ))}
      </AnimatePresence>
    </>
  );
}
