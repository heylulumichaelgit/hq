"use client";

import { useState, useEffect } from "react";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
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
import { useCreateHoliday, useUpdateHoliday } from "../queries";
import type { Holiday, HolidayInsert } from "../queries";
import { useAuthStore } from "@/features/auth/store";

interface HolidayFormDialogProps {
  holiday?: Holiday;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const emptyForm = {
  title: "",
  destination: "",
  start_date: "",
  end_date: "",
  status: "planning" as Holiday["status"],
  attendees: "",
  budget: "",
  currency: "EUR",
  booking_ref: "",
  notes: "",
};

export function HolidayFormDialog({
  holiday,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: HolidayFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange?.(v)
    : setInternalOpen;

  const [form, setForm] = useState(emptyForm);
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const { user } = useAuthStore();

  const isEdit = !!holiday;

  useEffect(() => {
    if (open) {
      if (holiday) {
        setForm({
          title: holiday.title,
          destination: holiday.destination ?? "",
          start_date: holiday.start_date ?? "",
          end_date: holiday.end_date ?? "",
          status: holiday.status,
          attendees: holiday.attendees ?? "",
          budget: holiday.budget != null ? String(holiday.budget) : "",
          currency: holiday.currency ?? "EUR",
          booking_ref: holiday.booking_ref ?? "",
          notes: holiday.notes ?? "",
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, holiday]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload: HolidayInsert = {
      title: form.title.trim(),
      destination: form.destination.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      attendees: form.attendees.trim() || null,
      budget: form.budget ? parseFloat(form.budget) : null,
      currency: form.currency.trim() || "EUR",
      booking_ref: form.booking_ref.trim() || null,
      notes: form.notes.trim() || null,
      created_by: holiday?.created_by ?? user?.id ?? null,
    };

    if (isEdit && holiday) {
      await updateHoliday.mutateAsync({ id: holiday.id, ...payload });
    } else {
      await createHoliday.mutateAsync(payload);
    }

    setOpen(false);
  };

  const isPending = createHoliday.isPending || updateHoliday.isPending;

  return (
    <ResponsiveDialog open={open} onOpenChange={setOpen}>
      <ResponsiveDialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{isEdit ? "Edit Trip" : "Add Trip"}</ResponsiveDialogTitle>
        </ResponsiveDialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holiday-title">Title *</Label>
            <Input
              id="holiday-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Summer in Greece"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="holiday-destination">Destination</Label>
            <Input
              id="holiday-destination"
              value={form.destination}
              onChange={(e) =>
                setForm((f) => ({ ...f, destination: e.target.value }))
              }
              placeholder="e.g. Santorini, Greece"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="holiday-start-date">Start date</Label>
              <Input
                id="holiday-start-date"
                type="date"
                value={form.start_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, start_date: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-end-date">End date</Label>
              <Input
                id="holiday-end-date"
                type="date"
                value={form.end_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, end_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holiday-status">Status</Label>
            <Select
              value={form.status}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, status: v as Holiday["status"] }))
              }
            >
              <SelectTrigger id="holiday-status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holiday-attendees">Attendees</Label>
            <Input
              id="holiday-attendees"
              value={form.attendees}
              onChange={(e) =>
                setForm((f) => ({ ...f, attendees: e.target.value }))
              }
              placeholder="e.g. Andrew, Chrystalla, Lulu"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="holiday-budget">Budget</Label>
              <Input
                id="holiday-budget"
                type="number"
                min="0"
                step="0.01"
                value={form.budget}
                onChange={(e) =>
                  setForm((f) => ({ ...f, budget: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holiday-currency">Currency</Label>
              <Input
                id="holiday-currency"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
                placeholder="EUR"
                maxLength={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holiday-booking-ref">Booking reference</Label>
            <Input
              id="holiday-booking-ref"
              value={form.booking_ref}
              onChange={(e) =>
                setForm((f) => ({ ...f, booking_ref: e.target.value }))
              }
              placeholder="e.g. ABC123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="holiday-notes">Notes</Label>
            <Textarea
              id="holiday-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Packing lists, reminders, ideas…"
              rows={3}
              className="resize-none"
            />
          </div>

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!form.title.trim() || isPending}>
              {isPending ? "Saving…" : isEdit ? "Save changes" : "Add Trip"}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
