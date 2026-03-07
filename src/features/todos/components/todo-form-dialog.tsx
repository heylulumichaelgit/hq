"use client";

import { useState } from "react";
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
import { useCreateTodo, useUpdateTodo } from "../queries";
import { useAuthStore } from "@/features/auth/store";
import { todoSchema } from "../schema";
import type { Todo } from "@/lib/supabase/types";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface TodoFormDialogProps {
  todo?: Todo;
  trigger?: React.ReactNode;
}

export function TodoFormDialog({ todo, trigger }: TodoFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuthStore();
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();

  const isEditing = !!todo;

  const [form, setForm] = useState({
    title: todo?.title ?? "",
    description: todo?.description ?? "",
    due_date: todo?.due_date ? format(new Date(todo.due_date), "yyyy-MM-dd") : "",
    priority: todo?.priority ?? "medium",
    assigned_to: todo?.assigned_to ?? "Both",
  });

  const resetForm = () => {
    setForm({
      title: todo?.title ?? "",
      description: todo?.description ?? "",
      due_date: todo?.due_date ? format(new Date(todo.due_date), "yyyy-MM-dd") : "",
      priority: todo?.priority ?? "medium",
      assigned_to: todo?.assigned_to ?? "Both",
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
        });
      } else {
        await createTodo.mutateAsync({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          priority: data.priority,
          assigned_to: data.assigned_to,
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
          assigned_to: "Both",
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
          <Button className="min-h-[48px] gap-2">
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
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="What needs to be done?"
              className="min-h-[48px]"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title}</p>
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
                className="min-h-[48px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, priority: v as typeof f.priority }))
                }
              >
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned To</Label>
            <Select
              value={form.assigned_to}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  assigned_to: v as typeof f.assigned_to,
                }))
              }
            >
              <SelectTrigger className="min-h-[48px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Andrew">Andrew</SelectItem>
                <SelectItem value="Chrystalla">Chrystalla</SelectItem>
                <SelectItem value="Both">Both</SelectItem>
                <SelectItem value="Lulu">Lulu ✨</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {errors.form && (
            <p className="text-sm text-destructive">{errors.form}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="min-h-[48px]"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="min-h-[48px]" disabled={isPending}>
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
