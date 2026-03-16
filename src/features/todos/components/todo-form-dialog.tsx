"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateTodo, useUpdateTodo, useSections } from "../queries";
import { useProjects } from "@/features/projects/queries";
import { useAuthStore } from "@/features/auth/store";
import { todoSchema } from "../schema";
import type { Todo } from "@/lib/supabase/types";
import { Plus, Loader2, Repeat2, Calendar } from "lucide-react";
import { AssigneePicker } from "./assignee-picker";
import { RECURRENCE_OPTIONS } from "@/lib/recurrence";
import { parseDateFromText } from "@/lib/parse-date";
import { format } from "date-fns";

interface TodoFormDialogProps {
  todo?: Todo;
  trigger?: React.ReactNode;
  defaultProjectId?: string | null;
  defaultSection?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TodoFormDialog({ todo, trigger, defaultProjectId, defaultSection, open: controlledOpen, onOpenChange }: TodoFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? (v: boolean) => onOpenChange?.(v) : setInternalOpen;
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuthStore();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const { data: projects = [] } = useProjects();
  const existingSections = useSections(todo?.project_id ?? defaultProjectId);

  const isEditing = !!todo;

  const [form, setForm] = useState({
    title: todo?.title ?? "",
    description: todo?.description ?? "",
    due_date: todo?.due_date
      ? format(new Date(todo.due_date), "yyyy-MM-dd")
      : "",
    priority: todo?.priority ?? "medium",
    assigned_to: todo?.assigned_to ?? "Andrew,Chrystalla",
    section: todo?.section ?? defaultSection ?? "",
    project_id: todo?.project_id ?? defaultProjectId ?? null,
    recurrence_rule: todo?.recurrence_rule ?? null,
    duration_minutes: todo?.duration_minutes ?? null,
  });

  const resetForm = () => {
    setForm({
      title: todo?.title ?? "",
      description: todo?.description ?? "",
      due_date: todo?.due_date
        ? format(new Date(todo.due_date), "yyyy-MM-dd")
        : "",
      priority: todo?.priority ?? "medium",
      assigned_to: todo?.assigned_to ?? "Andrew,Chrystalla",
      section: todo?.section ?? defaultSection ?? "",
      project_id: todo?.project_id ?? defaultProjectId ?? null,
      recurrence_rule: todo?.recurrence_rule ?? null,
      duration_minutes: todo?.duration_minutes ?? null,
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = todoSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        if (path) fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    const data = result.data;

    try {
      if (isEditing && todo) {
        await updateTodo.mutateAsync({
          id: todo.id,
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority,
          assigned_to: data.assigned_to,
          section: data.section || null,
          project_id: data.project_id ?? null,
          recurrence_rule: data.recurrence_rule ?? null,
          duration_minutes: data.duration_minutes ?? null,
        });
      } else {
        await createTodo.mutateAsync({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority,
          assigned_to: data.assigned_to,
          section: data.section || null,
          project_id: data.project_id ?? null,
          recurrence_rule: data.recurrence_rule ?? null,
          duration_minutes: data.duration_minutes ?? null,
          created_by: user!.id,
        });
      }

      setOpen(false);
      if (!isEditing) {
        setForm({
          title: "",
          description: "",
          due_date: "",
          priority: "medium",
          assigned_to: "Andrew,Chrystalla",
          section: defaultSection ?? "",
          project_id: defaultProjectId ?? null,
          recurrence_rule: null,
          duration_minutes: null,
        });
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Something went wrong";
      setErrors({ form: message });
    }
  };

  const isPending = createTodo.isPending || updateTodo.isPending;

  // NLP date detection (only when due_date not manually set)
  const parsedDate = useMemo(
    () => (!form.due_date && !isEditing ? parseDateFromText(form.title) : null),
    [form.title, form.due_date, isEditing]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="h-9 gap-2">
            <Plus className="h-5 w-5" />
            <span>Add Todo</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Todo" : "New Todo"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              placeholder="What needs to be done?"
              className="h-9"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
            )}
            {parsedDate && (
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({ ...f, due_date: parsedDate.dateStr }))
                }
                className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 hover:bg-primary/20 rounded px-2 py-1 transition-colors w-fit"
              >
                <Calendar className="h-3 w-3" />
                Set due: {parsedDate.label}
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Additional details..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label>Repeat</Label>
              <Select
                value={form.recurrence_rule ?? "none"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    recurrence_rule: v === "none" ? null : v,
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <Repeat2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Never" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Never</SelectItem>
                  {RECURRENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    priority: v as typeof f.priority,
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
              <Select
                value={form.duration_minutes == null ? "none" : String(form.duration_minutes)}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    duration_minutes: v === "none" ? null : Number(v),
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="No estimate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No estimate</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="180">3 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assigned To</Label>
              <AssigneePicker
                value={form.assigned_to}
                onChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="section">Section</Label>
              <Input
                id="section"
                value={form.section}
                onChange={(e) =>
                  setForm((f) => ({ ...f, section: e.target.value }))
                }
                placeholder="e.g. House, Admin, Kids"
                className="h-9"
                list="section-suggestions"
              />
              <datalist id="section-suggestions">
                {existingSections.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
          </div>

          {projects.length > 0 && (
            <div className="space-y-2">
              <Label>Project</Label>
              <Select
                value={form.project_id ?? "inbox"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    project_id: v === "inbox" ? null : v,
                  }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Inbox" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inbox">Inbox</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: p.color }}
                        />
                        {p.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {errors.form && (
            <p className="text-sm text-destructive">{errors.form}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9"
              disabled={isPending}
            >
              {isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isEditing ? (
                "Save Changes"
              ) : (
                "Add Todo"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
