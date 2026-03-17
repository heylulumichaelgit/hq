"use client";

import { useState } from "react";
import { Star, Pencil, Trash2, Phone, Mail, Globe, MapPin, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useDeleteService, useToggleFavourite } from "../queries";
import type { ServicePartner } from "../queries";
import { ServiceFormDialog } from "./service-form-dialog";

const CATEGORY_COLORS: Record<string, string> = {
  Plumbing: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  Electrical: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  Painting: "bg-orange-500/10 text-orange-700 dark:text-orange-300",
  Cleaning: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  Medical: "bg-red-500/10 text-red-700 dark:text-red-300",
  Dental: "bg-pink-500/10 text-pink-700 dark:text-pink-300",
  Automotive: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
  Legal: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  Financial: "bg-green-500/10 text-green-700 dark:text-green-300",
  School: "bg-purple-500/10 text-purple-700 dark:text-purple-300",
  Other: "bg-muted text-muted-foreground",
};

interface ServiceCardProps {
  partner: ServicePartner;
}

export function ServiceCard({ partner }: ServiceCardProps) {
  const deleteService = useDeleteService();
  const toggleFavourite = useToggleFavourite();
  const [editOpen, setEditOpen] = useState(false);

  const categoryColor = CATEGORY_COLORS[partner.category] ?? CATEGORY_COLORS.Other;

  return (
    <>
      <Card className="group transition-shadow hover:shadow-sm">
        <CardContent className="p-4 space-y-3">
          {/* Header row */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{partner.name}</p>
              <Badge
                variant="secondary"
                className={cn("mt-1 text-[11px] font-medium px-1.5 py-0", categoryColor)}
              >
                {partner.category}
              </Badge>
            </div>

            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "size-7",
                  partner.is_favourite
                    ? "text-amber-500 opacity-100!"
                    : "text-muted-foreground"
                )}
                onClick={() =>
                  toggleFavourite.mutate({
                    id: partner.id,
                    is_favourite: !partner.is_favourite,
                  })
                }
                aria-label={partner.is_favourite ? "Remove from favourites" : "Add to favourites"}
              >
                <Star
                  className={cn("size-3.5", partner.is_favourite && "fill-amber-500")}
                />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="size-7 text-muted-foreground"
                onClick={() => setEditOpen(true)}
                aria-label="Edit service"
              >
                <Pencil className="size-3.5" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    aria-label="Delete service"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remove service?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove{" "}
                      <strong>{partner.name}</strong> from your directory. This
                      action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => deleteService.mutate(partner.id)}
                    >
                      Remove
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            {/* Always-visible star for favourites */}
            {partner.is_favourite && (
              <Star className="size-3.5 fill-amber-500 text-amber-500 shrink-0 group-hover:hidden" />
            )}
          </div>

          {/* Contact details */}
          <div className="space-y-1.5">
            {partner.phone && (
              <a
                href={`tel:${partner.phone}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group/link"
              >
                <Phone className="size-3.5 shrink-0" />
                <span className="truncate group-hover/link:underline">{partner.phone}</span>
              </a>
            )}
            {partner.email && (
              <a
                href={`mailto:${partner.email}`}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group/link"
              >
                <Mail className="size-3.5 shrink-0" />
                <span className="truncate group-hover/link:underline">{partner.email}</span>
              </a>
            )}
            {partner.website && (
              <a
                href={partner.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group/link"
              >
                <Globe className="size-3.5 shrink-0" />
                <span className="truncate group-hover/link:underline">
                  {partner.website.replace(/^https?:\/\//, "")}
                </span>
              </a>
            )}
            {partner.address && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{partner.address}</span>
              </div>
            )}
            {partner.notes && (
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <FileText className="size-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-2 italic">{partner.notes}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ServiceFormDialog
        partner={partner}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}
