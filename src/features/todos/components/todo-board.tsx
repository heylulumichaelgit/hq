"use client";

import { useState, useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTodos, useUpdateTodo, useSections } from "../queries";
import { TodoFormDialog } from "./todo-form-dialog";
import type { Todo } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { Calendar, User, ListTree, Plus, Loader2 } from "lucide-react";
import { format, isPast, isToday, startOfDay } from "date-fns";
import { Button } from "@/components/ui/button";

// ─── Priority colours ────────────────────────────────────────────────────────

const priorityBorder: Record<string, string> = {
  high: "border-l-red-500",
  medium: "border-l-orange-400",
  low: "border-l-muted-foreground/30",
};

const priorityDot: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-orange-400",
  low: "bg-muted-foreground/30",
};

// ─── Date helpers ─────────────────────────────────────────────────────────────

function formatCardDate(dateStr: string): { label: string; className: string } {
  const date = startOfDay(new Date(dateStr));
  if (isToday(date)) return { label: "Today", className: "text-blue-500" };
  if (isPast(date)) return { label: format(date, "MMM d"), className: "text-destructive" };
  return { label: format(date, "MMM d"), className: "text-muted-foreground" };
}

// ─── KanbanCard ───────────────────────────────────────────────────────────────

function KanbanCard({
  todo,
  allTodos,
  isDragging = false,
}: {
  todo: Todo;
  allTodos: Todo[];
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const subtaskCount = allTodos.filter(
    (t) => t.parent_id === todo.id
  ).length;

  const dateInfo = todo.due_date ? formatCardDate(todo.due_date) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-md border border-l-4 bg-card p-3 space-y-1.5 shadow-sm",
        "cursor-grab active:cursor-grabbing select-none",
        "hover:shadow-md transition-shadow",
        priorityBorder[todo.priority]
      )}
    >
      {/* Title row */}
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1 h-2 w-2 shrink-0 rounded-full",
            priorityDot[todo.priority]
          )}
        />
        <span className="text-sm font-medium leading-snug line-clamp-2">
          {todo.title}
        </span>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pl-4">
        {dateInfo && (
          <span className={cn("flex items-center gap-1", dateInfo.className)}>
            <Calendar className="h-3 w-3" />
            {dateInfo.label}
          </span>
        )}

        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {todo.assigned_to}
        </span>

        {subtaskCount > 0 && (
          <span className="flex items-center gap-1">
            <ListTree className="h-3 w-3" />
            {subtaskCount}
          </span>
        )}
      </div>
    </div>
  );
}

// Ghost card shown in the DragOverlay
function GhostCard({ todo }: { todo: Todo }) {
  const dateInfo = todo.due_date ? formatCardDate(todo.due_date) : null;

  return (
    <div
      className={cn(
        "rounded-md border border-l-4 bg-card p-3 space-y-1.5 shadow-xl rotate-2",
        "cursor-grabbing select-none opacity-95",
        priorityBorder[todo.priority]
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "mt-1 h-2 w-2 shrink-0 rounded-full",
            priorityDot[todo.priority]
          )}
        />
        <span className="text-sm font-medium leading-snug line-clamp-2">
          {todo.title}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pl-4">
        {dateInfo && (
          <span className={cn("flex items-center gap-1", dateInfo.className)}>
            <Calendar className="h-3 w-3" />
            {dateInfo.label}
          </span>
        )}
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {todo.assigned_to}
        </span>
      </div>
    </div>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────

const UNSECTIONED_ID = "__unsectioned__";

function BoardColumn({
  columnId,
  label,
  todos,
  allTodos,
  activeId,
  projectId,
}: {
  columnId: string;
  label: string;
  todos: Todo[];
  allTodos: Todo[];
  activeId: string | null;
  projectId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: columnId });

  const todoIds = todos.map((t) => t.id);

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2">
        <span className="text-sm font-semibold">{label}</span>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-muted px-1.5 text-xs text-muted-foreground">
          {todos.length}
        </span>
      </div>

      {/* Scrollable cards */}
      <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 space-y-2 overflow-y-auto px-3 py-1",
            "max-h-[calc(100vh-260px)]",
            isOver && "ring-2 ring-inset ring-primary/30 rounded-lg"
          )}
        >
          {todos.map((todo) => (
            <KanbanCard
              key={todo.id}
              todo={todo}
              allTodos={allTodos}
              isDragging={todo.id === activeId}
            />
          ))}

          {todos.length === 0 && !isOver && (
            <div className="flex h-16 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>

      {/* Footer quick-add */}
      <div className="px-3 pb-3 pt-2">
        <TodoFormDialog
          defaultProjectId={projectId}
          defaultSection={columnId === UNSECTIONED_ID ? undefined : label}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-1.5 text-muted-foreground hover:text-foreground h-8 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Add task
            </Button>
          }
        />
      </div>
    </div>
  );
}

// ─── TodoBoard ────────────────────────────────────────────────────────────────

interface TodoBoardProps {
  projectId: string | null;
}

export function TodoBoard({ projectId }: TodoBoardProps) {
  const { data: todos, isLoading } = useTodos();
  const sections = useSections(projectId);
  const updateTodo = useUpdateTodo();

  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // All top-level, active todos scoped to this project
  const projectTodos = useMemo(
    () =>
      (todos ?? []).filter(
        (t) =>
          !t.parent_id &&
          !t.is_completed &&
          t.project_id === projectId
      ),
    [todos, projectId]
  );

  // Build columns: named sections + unsectioned
  const columns = useMemo(() => {
    const cols: Array<{ id: string; label: string; todos: Todo[] }> = [];

    // Named sections first (sorted)
    const sortedSections = [...sections].sort((a, b) => a.localeCompare(b));

    for (const section of sortedSections) {
      cols.push({
        id: section,
        label: section,
        todos: projectTodos.filter((t) => t.section === section),
      });
    }

    // Unsectioned column — only show if there are unsectioned todos OR no named sections
    const unsectionedTodos = projectTodos.filter((t) => !t.section);
    if (unsectionedTodos.length > 0 || sortedSections.length === 0) {
      cols.push({
        id: UNSECTIONED_ID,
        label: "Unsectioned",
        todos: unsectionedTodos,
      });
    }

    return cols;
  }, [sections, projectTodos]);

  const activeTodo = useMemo(
    () => (activeId ? (todos ?? []).find((t) => t.id === activeId) ?? null : null),
    [activeId, todos]
  );

  // Build a lookup: todoId → columnId
  const todoColumnMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const col of columns) {
      for (const todo of col.todos) {
        map.set(todo.id, col.id);
      }
    }
    return map;
  }, [columns]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);

    const { active, over } = event;
    if (!over) return;

    const draggedId = active.id as string;

    // Determine the target column. `over.id` can be a column droppable id
    // (when dropped on the empty area) or another card's id (when dropped over a card).
    let targetColumnId: string;

    if (columns.some((c) => c.id === over.id)) {
      // Dropped directly onto a column droppable
      targetColumnId = over.id as string;
    } else {
      // Dropped onto a card — find which column that card belongs to
      const overCardColumnId = todoColumnMap.get(over.id as string);
      if (!overCardColumnId) return;
      targetColumnId = overCardColumnId;
    }

    const currentColumnId = todoColumnMap.get(draggedId);
    if (!currentColumnId || currentColumnId === targetColumnId) return;

    const newSection =
      targetColumnId === UNSECTIONED_ID ? null : targetColumnId;

    updateTodo.mutate({ id: draggedId, section: newSection });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 pb-4">
        {columns.map((col) => (
          <BoardColumn
            key={col.id}
            columnId={col.id}
            label={col.label}
            todos={col.todos}
            allTodos={todos ?? []}
            activeId={activeId}
            projectId={projectId}
          />
        ))}
      </div>

      <DragOverlay>
        {activeTodo ? <GhostCard todo={activeTodo} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
