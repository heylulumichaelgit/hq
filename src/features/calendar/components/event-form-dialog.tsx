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
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2 } from "lucide-react";
import { useCreateFamilyEvent } from "../queries";
import { familyEventSchema } from "../schema";
import { format } from "date-fns";

interface EventFormDialogProps {
  defaultDate?: Date;
  trigger?: React.ReactNode;
}

export function EventFormDialog({ defaultDate, trigger }: EventFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createEvent = useCreateFamilyEvent();

  const today = defaultDate ?? new Date();
  const defaultDateStr = format(today, "yyyy-MM-dd");

  const [form, setForm] = useState({
    title: "",
    description: "",
    start_date: defaultDateStr,
    start_time: "09:00",
    end_date: defaultDateStr,
    end_time: "10:00",
    all_day: false,
    create_busy_events: true,
  });

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      start_date: defaultDateStr,
      start_time: "09:00",
      end_date: defaultDateStr,
      end_time: "10:00",
      all_day: false,
      create_busy_events: true,
    });
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = familyEventSchema.safeParse(form);
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

    const start_at = data.all_day
      ? `${data.start_date}T00:00:00.000Z`
      : `${data.start_date}T${data.start_time ?? "00:00"}:00`;

    const end_at = data.all_day
      ? `${data.end_date}T23:59:59.000Z`
      : `${data.end_date}T${data.end_time ?? "01:00"}:00`;

    try {
      await createEvent.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        start_at,
        end_at,
        all_day: data.all_day,
        create_busy_events: data.create_busy_events,
      });
      setOpen(false);
      resetForm();
    } catch (err) {
      setErrors({
        form: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

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
            <span>Add Event</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Family Event</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Lulu's birthday party"
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
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Additional details…"
              rows={2}
            />
          </div>

          <div className="flex items-center gap-3">
            <Switch
              id="all_day"
              checked={form.all_day}
              onCheckedChange={(v) => setForm((f) => ({ ...f, all_day: v }))}
            />
            <Label htmlFor="all_day" className="cursor-pointer">All day</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start date *</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                className="min-h-[48px]"
              />
            </div>
            {!form.all_day && (
              <div className="space-y-2">
                <Label htmlFor="start_time">Start time</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                  className="min-h-[48px]"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="end_date">End date *</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
                className="min-h-[48px]"
              />
            </div>
            {!form.all_day && (
              <div className="space-y-2">
                <Label htmlFor="end_time">End time</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={form.end_time}
                  onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                  className="min-h-[48px]"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-3">
            <Switch
              id="create_busy"
              checked={form.create_busy_events}
              onCheckedChange={(v) => setForm((f) => ({ ...f, create_busy_events: v }))}
            />
            <div>
              <Label htmlFor="create_busy" className="cursor-pointer text-sm">
                Block work calendars
              </Label>
              <p className="text-xs text-muted-foreground">
                Adds a busy event to everyone's marked work calendars
              </p>
            </div>
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
            <Button
              type="submit"
              className="min-h-[48px]"
              disabled={createEvent.isPending}
            >
              {createEvent.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                "Add Event"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
