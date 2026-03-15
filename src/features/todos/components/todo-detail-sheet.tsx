"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Folder,
  Repeat2,
  User,
  Trash2,
  X,
  Plus,
  Check,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import { useUpdateTodo, useDeleteTodo, useToggleTodo } from "../queries";
import { useProjects } from "@/features/projects/queries";
import {
  useAllTodoLabels,
  useLabels,
  useAddLabelToTodo,
  useRemoveLabelFromTodo,
} from "@/features/labels/queries";
import { CommentPanel } from "./comment-panel";
import { InlineQuickAdd } from "./inline-quick-add";
import { RECURRENCE_OPTIONS, getRecurrenceLabel } from "@/lib/recurrence";
import { cn } from "@/lib/utils";
import type { Todo } from "@/lib/supabase/types";
import type { AssignedTo, Priority } from "@/lib/supabase/types";

interface TodoDetailSheetProps {
  todo: Todo | null;
  allTodos: Todo[];
  onClose: () => void;
}

const ASSIGNED_TO_OPTIONS: AssignedTo[] = [
  "Andrew",
  "Chrystalla",
  "Both",
  "Lulu",
];

const PRIORITY_OPTIONS: Priority[] = ["high", "medium", "low"];

const priorityColors: Record<Priority, { dot: string; label: string }> = {
  high: { dot: "bg-destructive", label: "text-destructive" },
  medium: { dot: "bg-amber-700 dark:bg-amber-500", label: "text-amber-700 dark:text-amber-400" },
  low: { dot: "bg-muted-foreground/40", label: "text-muted-foreground" },
};

const assigneeColors: Record<
  AssignedTo,
  { bg: string; text: string; ring: string }
> = {
  Andrew: {
    bg: "bg-stone-200 dark:bg-stone-700/50",
    text: "text-stone-700 dark:text-stone-300",
    ring: "ring-stone-300 dark:ring-stone-600",
  },
  Chrystalla: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-800 dark:text-amber-300",
    ring: "ring-amber-300 dark:ring-amber-700",
  },
  Both: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-border",
  },
  Lulu: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-200 dark:ring-rose-700",
  },
};

function AssigneePill({
  value,
  onClick,
}: {
  value: AssignedTo;
  onClick: () => void;
}) {
  const colors = assigneeColors[value];
  const initials =
    value === "Both"
      ? "Bo"
      : value.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-opacity hover:opacity-80",
        colors.bg,
        colors.text,
        colors.ring
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[9px] font-bold">
        {initials}
      </span>
      {value}
    </button>
  );
}

function SubtaskCheckbox({
  checked,
  priority,
  onChange,
}: {
  checked: boolean;
  priority: Priority;
  onChange: (checked: boolean) => void;
}) {
  const borderColor =
    priority === "high"
      ? "border-destructive"
      : priority === "medium"
        ? "border-amber-700 dark:border-amber-500"
        : "border-muted-foreground/40";
  const fillColor =
    priority === "high"
      ? "bg-destructive"
      : priority === "medium"
        ? "bg-amber-700 dark:bg-amber-500"
        : "bg-muted-foreground/40";

  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-all",
        checked ? cn(fillColor, "border-transparent") : borderColor
      )}
    >
      {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
    </button>
  );
}

export function TodoDetailSheet({
  todo,
  allTodos,
  onClose,
}: TodoDetailSheetProps) {
  const queryClient = useQueryClient();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();
  const toggleTodo = useToggleTodo();
  const { data: projects = [] } = useProjects();
  const { data: allLabels = [] } = useLabels();
  const todoLabelsMap = useAllTodoLabels();
  const addLabel = useAddLabelToTodo();
  const removeLabel = useRemoveLabelFromTodo();

  const todoRef = useRef(todo);
  useEffect(() => { todoRef.current = todo; }, [todo]);

  const revertTodo = () => queryClient.invalidateQueries({ queryKey: ["todos"] });

  const [titleValue, setTitleValue] = useState(todo?.title ?? "");
  const [descriptionValue, setDescriptionValue] = useState(
    todo?.description ?? ""
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false);

  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Sync local state when todo changes
  useEffect(() => {
    if (todo) {
      setTitleValue(todo.title);
      setDescriptionValue(todo.description ?? "");
    }
    setShowDatePicker(false);
    setLabelPopoverOpen(false);
  }, [todo?.id]);

  // Auto-resize textarea
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    autoResize(titleRef.current);
  }, [titleValue, autoResize]);

  if (!todo) return null;

  const project = projects.find((p) => p.id === todo.project_id) ?? null;
  const todoLabels = todoLabelsMap.get(todo.id) ?? [];
  const subtasks = allTodos.filter((t) => t.parent_id === todo.id);
  const completedSubtasks = subtasks.filter((t) => t.is_completed).length;

  const handleTitleBlur = () => {
    const t = todoRef.current;
    if (!t) return;
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== t.title) {
      updateTodo.mutate({ id: t.id, title: trimmed }, { onError: () => setTitleValue(t.title) });
    }
  };

  const handleDescriptionBlur = () => {
    const t = todoRef.current;
    if (!t) return;
    if (descriptionValue !== (t.description ?? "")) {
      updateTodo.mutate({ id: t.id, description: descriptionValue || null }, { onError: () => setDescriptionValue(t.description ?? "") });
    }
  };

  const cycleAssignee = () => {
    const idx = ASSIGNED_TO_OPTIONS.indexOf(todo.assigned_to);
    const next = ASSIGNED_TO_OPTIONS[(idx + 1) % ASSIGNED_TO_OPTIONS.length];
    updateTodo.mutate({ id: todo.id, assigned_to: next }, { onError: revertTodo });
  };

  const cyclePriority = () => {
    const idx = PRIORITY_OPTIONS.indexOf(todo.priority);
    const next = PRIORITY_OPTIONS[(idx + 1) % PRIORITY_OPTIONS.length];
    updateTodo.mutate({ id: todo.id, priority: next }, { onError: revertTodo });
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      updateTodo.mutate({
        id: todo.id,
        due_date: format(date, "yyyy-MM-dd"),
      }, { onError: revertTodo });
    } else {
      updateTodo.mutate({ id: todo.id, due_date: null }, { onError: revertTodo });
    }
    setShowDatePicker(false);
  };

  const handleDurationChange = (value: string) => {
    updateTodo.mutate({
      id: todo.id,
      duration_minutes: value === "none" ? null : parseInt(value, 10),
    }, { onError: revertTodo });
  };

  const handleRecurrenceChange = (value: string) => {
    updateTodo.mutate({
      id: todo.id,
      recurrence_rule: value === "none" ? null : value,
    }, { onError: revertTodo });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  };

  const handleDelete = () => {
    deleteTodo.mutate(todo.id, { onSuccess: onClose });
  };

  const selectedDate = todo.due_date
    ? new Date(todo.due_date + "T00:00:00")
    : undefined;

  return (
    <Sheet open={!!todo} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-lg p-0 flex flex-col"
      >
        {/* Hidden accessible title for screen readers */}
        <SheetTitle className="sr-only">
          {todo.title}
        </SheetTitle>

        {/* Header */}
        <SheetHeader className="sticky top-0 z-10 bg-background px-6 py-4 border-b gap-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {project ? (
                <>
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium text-foreground/70">
                    {project.name}
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30 shrink-0" />
                  <span className="font-medium text-foreground/70">Inbox</span>
                </>
              )}
            </div>
            <button
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          <textarea
            ref={titleRef}
            value={titleValue}
            onChange={(e) => {
              setTitleValue(e.target.value);
              autoResize(e.target);
            }}
            onBlur={handleTitleBlur}
            rows={1}
            className={cn(
              "w-full resize-none overflow-hidden bg-transparent text-xl font-semibold leading-snug",
              "border-0 p-0 focus:outline-none focus:ring-0 placeholder:text-muted-foreground/50",
              todo.is_completed && "line-through text-muted-foreground"
            )}
            placeholder="Task title"
          />
        </SheetHeader>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Section 1 — Properties */}
          <div className="grid grid-cols-[120px_1fr] gap-y-3 items-center text-sm">
            {/* Assignee */}
            <span className="text-muted-foreground">Assignee</span>
            <AssigneePill value={todo.assigned_to} onClick={cycleAssignee} />

            {/* Due date */}
            <span className="text-muted-foreground">Due date</span>
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 text-left text-sm hover:text-foreground transition-colors">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  {todo.due_date ? (
                    <span>{format(new Date(todo.due_date + "T00:00:00"), "MMM d, yyyy")}</span>
                  ) : (
                    <span className="text-muted-foreground">No date</span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
                {todo.due_date && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-7 text-xs text-muted-foreground"
                      onClick={() => handleDateSelect(undefined)}
                    >
                      Clear date
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Priority */}
            <span className="text-muted-foreground">Priority</span>
            <button
              onClick={cyclePriority}
              className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
            >
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full shrink-0",
                  priorityColors[todo.priority].dot
                )}
              />
              <span
                className={cn(
                  "capitalize",
                  priorityColors[todo.priority].label
                )}
              >
                {todo.priority}
              </span>
            </button>

            {/* Duration */}
            <span className="text-muted-foreground">Duration</span>
            <Select
              value={todo.duration_minutes?.toString() ?? "none"}
              onValueChange={handleDurationChange}
            >
              <SelectTrigger className="h-7 w-auto gap-1.5 border-0 p-0 shadow-none text-sm focus:ring-0 [&>svg]:opacity-0 hover:opacity-70 transition-opacity">
                <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue>
                  {todo.duration_minutes
                    ? formatDuration(todo.duration_minutes)
                    : <span className="text-muted-foreground">None</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="15">15m</SelectItem>
                <SelectItem value="30">30m</SelectItem>
                <SelectItem value="45">45m</SelectItem>
                <SelectItem value="60">1h</SelectItem>
                <SelectItem value="90">1h 30m</SelectItem>
                <SelectItem value="120">2h</SelectItem>
                <SelectItem value="180">3h</SelectItem>
                <SelectItem value="240">4h</SelectItem>
              </SelectContent>
            </Select>

            {/* Recurrence */}
            <span className="text-muted-foreground">Recurrence</span>
            <Select
              value={todo.recurrence_rule ?? "none"}
              onValueChange={handleRecurrenceChange}
            >
              <SelectTrigger className="h-7 w-auto gap-1.5 border-0 p-0 shadow-none text-sm focus:ring-0 [&>svg]:opacity-0 hover:opacity-70 transition-opacity">
                <Repeat2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <SelectValue>
                  {todo.recurrence_rule
                    ? getRecurrenceLabel(todo.recurrence_rule)
                    : <span className="text-muted-foreground">None</span>}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Project */}
            <span className="text-muted-foreground">Project</span>
            <div className="flex items-center gap-1.5 text-sm">
              <Folder className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {project ? (
                <span>{project.name}</span>
              ) : (
                <span className="text-muted-foreground">Inbox</span>
              )}
            </div>
          </div>

          <Separator />

          {/* Section 2 — Labels */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {todoLabels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border"
                  style={{
                    backgroundColor: label.color + "18",
                    borderColor: label.color + "40",
                    color: label.color,
                  }}
                >
                  {label.name}
                  <button
                    onClick={() =>
                      removeLabel.mutate({
                        todoId: todo.id,
                        labelId: label.id,
                      })
                    }
                    className="ml-0.5 rounded-full opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}

              <Popover
                open={labelPopoverOpen}
                onOpenChange={setLabelPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <button className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground">
                    <Plus className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-1" align="start">
                  <div className="space-y-0.5">
                    {allLabels.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        No labels available
                      </p>
                    )}
                    {allLabels.map((label) => {
                      const isAdded = todoLabels.some((l) => l.id === label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => {
                            if (isAdded) {
                              removeLabel.mutate({
                                todoId: todo.id,
                                labelId: label.id,
                              });
                            } else {
                              addLabel.mutate({
                                todoId: todo.id,
                                labelId: label.id,
                              });
                            }
                          }}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent transition-colors"
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="flex-1 text-left">{label.name}</span>
                          {isAdded && (
                            <Check className="h-3 w-3 text-primary shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator />

          {/* Section 3 — Description */}
          <div>
            <textarea
              value={descriptionValue}
              onChange={(e) => setDescriptionValue(e.target.value)}
              onBlur={handleDescriptionBlur}
              rows={3}
              placeholder="Add a description..."
              className={cn(
                "w-full resize-none bg-transparent text-sm leading-relaxed",
                "border-0 p-0 focus:outline-none focus:ring-0",
                "placeholder:text-muted-foreground/50 text-foreground/80"
              )}
            />
          </div>

          <Separator />

          {/* Section 4 — Subtasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Subtasks</h3>
              {subtasks.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedSubtasks}/{subtasks.length}
                </span>
              )}
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5">
                {subtasks.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent/50 transition-colors"
                  >
                    <SubtaskCheckbox
                      checked={sub.is_completed}
                      priority={sub.priority}
                      onChange={(checked) =>
                        toggleTodo.mutate({
                          id: sub.id,
                          is_completed: checked,
                          recurrence_rule: sub.recurrence_rule,
                          due_date: sub.due_date,
                        })
                      }
                    />
                    <span
                      className={cn(
                        "flex-1 text-sm leading-snug",
                        sub.is_completed &&
                          "line-through text-muted-foreground"
                      )}
                    >
                      {sub.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <InlineQuickAdd
              parentId={todo.id}
              defaultAssignedTo={todo.assigned_to}
              defaultPriority={todo.priority}
              onDone={() => {}}
              placeholder="Add subtask..."
            />
          </div>

          <Separator />

          {/* Section 5 — Comments */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Comments</h3>
            <CommentPanel todoId={todo.id} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t px-6 py-3">
          <span className="text-xs text-muted-foreground">
            Created {format(new Date(todo.created_at), "MMM d, yyyy")}
          </span>
          <Button
            variant="destructive"
            size="sm"
            className="h-7 px-2.5 text-xs gap-1.5"
            onClick={handleDelete}
            disabled={deleteTodo.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
