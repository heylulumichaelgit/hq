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
import { LabelPicker } from "./label-picker";
import { CommentPanel } from "./comment-panel";
import type { Todo } from "@/lib/supabase/types";
import {
  MoreVertical,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  User,
  Plus,
  ListTree,
  ChevronRight,
  CheckCheck,
  Repeat2,
  MessageCircle,
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
import { getRecurrenceLabel } from "@/lib/recurrence";
import { TodoDetailSheet } from "./todo-detail-sheet";

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
  depth?: number;
  todoLabelsMap: Map<string, import("@/lib/supabase/types").Label[]>;
  commentCountsMap: Map<string, number>;
}

export function TodoItem({ todo, allTodos, depth = 0, todoLabelsMap, commentCountsMap }: TodoItemProps) {
  const isSubtask = depth > 0;
  const toggleTodo = useToggleTodo();
  const deleteTodo = useDeleteTodo();
  const [showSubtaskAdd, setShowSubtaskAdd] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(true);
  const [showCascadePrompt, setShowCascadePrompt] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const todoLabels = todoLabelsMap.get(todo.id) ?? [];
  const commentCount = commentCountsMap.get(todo.id) ?? 0;

  const subtasks = allTodos.filter((t) => t.parent_id === todo.id);
  const hasSubtasks = subtasks.length > 0;
  const incompleteSubtasks = subtasks.filter((t) => !t.is_completed);
  const progress = hasSubtasks
    ? getSubtaskProgress(allTodos, todo.id)
    : null;

  const handleCheckboxChange = (checked: boolean) => {
    if (checked && hasSubtasks && incompleteSubtasks.length > 0) {
      toggleTodo.mutate({
        id: todo.id,
        is_completed: true,
        recurrence_rule: todo.recurrence_rule,
        due_date: todo.due_date,
      });
      setShowCascadePrompt(true);
    } else {
      toggleTodo.mutate({
        id: todo.id,
        is_completed: checked,
        recurrence_rule: todo.recurrence_rule,
        due_date: todo.due_date,
      });
    }
  };

  const handleCascadeComplete = () => {
    incompleteSubtasks.forEach((sub) =>
      toggleTodo.mutate({
        id: sub.id,
        is_completed: true,
        recurrence_rule: sub.recurrence_rule,
        due_date: sub.due_date,
      })
    );
    setShowCascadePrompt(false);
  };

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
          depth === 1 && "ml-8 border-dashed",
          depth === 2 && "ml-16 border-dashed border-muted-foreground/30",
          todo.is_completed && "bg-muted/30"
        )}
      >
        <CircularCheckbox
          checked={todo.is_completed}
          priority={todo.priority}
          onChange={handleCheckboxChange}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <button
              className="text-left hover:underline focus:outline-none"
              onClick={() => setShowDetail(true)}
            >
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
            </button>
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

            {todo.duration_minutes && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                {todo.duration_minutes < 60
                  ? `${todo.duration_minutes}m`
                  : todo.duration_minutes % 60 === 0
                    ? `${todo.duration_minutes / 60}h`
                    : `${Math.floor(todo.duration_minutes / 60)}h ${todo.duration_minutes % 60}m`}
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

            {todoLabels.map((label) => (
              <span
                key={label.id}
                className="inline-flex items-center gap-1 rounded-full px-2 py-0 text-[10px] font-medium border"
                style={{
                  backgroundColor: label.color + "18",
                  borderColor: label.color + "40",
                  color: label.color,
                }}
              >
                {label.name}
              </span>
            ))}

            {todo.recurrence_rule && (
              <span className="flex items-center gap-1 text-primary/70">
                <Repeat2 className="h-3 w-3" />
                {getRecurrenceLabel(todo.recurrence_rule)}
              </span>
            )}

            {progress && progress.total > 0 && (
              <button
                onClick={() => setSubtasksOpen((o) => !o)}
                className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <motion.span
                  animate={{ rotate: subtasksOpen ? 90 : 0 }}
                  transition={{ duration: 0.15 }}
                  className="inline-flex"
                >
                  <ChevronRight className="h-3 w-3" />
                </motion.span>
                <ListTree className="h-3 w-3" />
                {progress.completed}/{progress.total}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center shrink-0">
          {/* Comment badge */}
          <button
            onClick={() => setShowComments((v) => !v)}
            className={cn(
              "flex items-center gap-1 text-xs rounded px-1.5 py-1 transition-colors",
              commentCount > 0
                ? "text-muted-foreground hover:text-foreground"
                : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground"
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {commentCount > 0 && <span>{commentCount}</span>}
          </button>

          {/* Label picker */}
          <LabelPicker todoId={todo.id} currentLabels={todoLabels} />

          {depth < 2 && !todo.is_completed && (
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

      {/* Cascade complete prompt */}
      <AnimatePresence>
        {showCascadePrompt && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5",
              depth === 1 && "ml-8",
              depth === 2 && "ml-16"
            )}
          >
            <CheckCheck className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              Complete {incompleteSubtasks.length} subtask{incompleteSubtasks.length > 1 ? "s" : ""} too?
            </span>
            <Button
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={handleCascadeComplete}
            >
              Complete all
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setShowCascadePrompt(false)}
            >
              Skip
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comment panel */}
      <AnimatePresence>
        {showComments && <CommentPanel todoId={todo.id} />}
      </AnimatePresence>

      {/* Subtask inline add */}
      <AnimatePresence>
        {showSubtaskAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={depth === 0 ? "ml-8" : "ml-16"}
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

      {/* Render subtasks (collapsible) */}
      <AnimatePresence>
        {subtasksOpen && subtasks.map((sub) => (
          <TodoItem key={sub.id} todo={sub} allTodos={allTodos} depth={depth + 1} todoLabelsMap={todoLabelsMap} commentCountsMap={commentCountsMap} />
        ))}
      </AnimatePresence>

      <TodoDetailSheet
        todo={showDetail ? todo : null}
        allTodos={allTodos}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
