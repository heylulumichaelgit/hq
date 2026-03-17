"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreatePartner,
  useUpdatePartner,
  PARTNER_CATEGORIES,
} from "../queries";
import type { ServicePartner, ServicePartnerInsert } from "../queries";
import { useAuthStore } from "@/features/auth/store";

interface PartnerFormDialogProps {
  partner?: ServicePartner;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

const emptyForm = {
  name: "",
  category: "Other" as string,
  phone: "",
  email: "",
  website: "",
  address: "",
  notes: "",
};

export function PartnerFormDialog({
  partner,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  trigger,
}: PartnerFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => controlledOnOpenChange?.(v)
    : setInternalOpen;

  const [form, setForm] = useState(emptyForm);
  const createPartner = useCreatePartner();
  const updatePartner = useUpdatePartner();
  const { user } = useAuthStore();

  const isEdit = !!partner;

  useEffect(() => {
    if (open) {
      if (partner) {
        setForm({
          name: partner.name,
          category: partner.category,
          phone: partner.phone ?? "",
          email: partner.email ?? "",
          website: partner.website ?? "",
          address: partner.address ?? "",
          notes: partner.notes ?? "",
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [open, partner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    const payload: ServicePartnerInsert = {
      name: form.name.trim(),
      category: form.category,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      website: form.website.trim() || null,
      address: form.address.trim() || null,
      notes: form.notes.trim() || null,
      is_favourite: partner?.is_favourite ?? false,
      created_by: partner?.created_by ?? user?.id ?? null,
    };

    if (isEdit && partner) {
      await updatePartner.mutateAsync({ id: partner.id, ...payload });
    } else {
      await createPartner.mutateAsync(payload);
    }

    setOpen(false);
  };

  const isPending = createPartner.isPending || updatePartner.isPending;

  return (
    <>
      {trigger && !isControlled && (
        <span onClick={() => setOpen(true)} className="cursor-pointer">
          {trigger}
        </span>
      )}
      {!trigger && !isControlled && (
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" />
          Add Partner
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Partner" : "Add Service Partner"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="partner-name">Name *</Label>
              <Input
                id="partner-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. John's Plumbing Co."
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-category">Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger id="partner-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PARTNER_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="partner-phone">Phone</Label>
                <Input
                  id="partner-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 555 000 0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partner-email">Email</Label>
                <Input
                  id="partner-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="contact@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-website">Website</Label>
              <Input
                id="partner-website"
                type="url"
                value={form.website}
                onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-address">Address</Label>
              <Input
                id="partner-address"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="123 Main St, City"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="partner-notes">Notes</Label>
              <Textarea
                id="partner-notes"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any useful notes about this contact..."
                rows={3}
                className="resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!form.name.trim() || isPending}>
                {isPending ? "Saving…" : isEdit ? "Save changes" : "Add Partner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
