"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ChevronDown, Search, Star, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { useServices, SERVICE_CATEGORIES } from "@/features/services/queries";
import type { ServicePartner } from "@/features/services/queries";
import { ServiceCard } from "@/features/services/components/service-card";
import { ServiceFormDialog } from "@/features/services/components/service-form-dialog";

export default function ServicesPage() {
  const { setSlot } = useHeaderSlot();
  const { data: services = [], isLoading } = useServices();
  const [search, setSearch] = useState("");
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setSlot(
      <div className="flex items-center gap-2">
        <Users className="size-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-semibold">Services</span>
      </div>
    );
    return () => setSlot(null);
  }, [setSlot]);

  const filtered = useMemo(() => {
    if (!search.trim()) return services;
    const q = search.toLowerCase();
    return services.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
    );
  }, [services, search]);

  const favourites = filtered.filter((p) => p.is_favourite);

  const byCategory = useMemo(() => {
    const map = new Map<string, ServicePartner[]>();
    for (const cat of SERVICE_CATEGORIES) map.set(cat, []);
    for (const p of filtered) {
      if (!map.has(p.category)) map.set(p.category, []);
      map.get(p.category)!.push(p);
    }
    return SERVICE_CATEGORIES.map((cat) => ({
      category: cat,
      items: map.get(cat) ?? [],
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  if (isLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
        <Skeleton className="h-9 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Search + Add */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or category…"
            className="pl-8 h-9 text-sm"
          />
        </div>
        <ServiceFormDialog />
      </div>

      {/* Empty state */}
      {services.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Building2 className="size-12 text-muted-foreground/30" />
          <p className="mt-4 text-base font-medium text-muted-foreground">
            No services yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            Add plumbers, doctors, cleaners and more to keep all your household contacts in one place.
          </p>
          <div className="mt-6">
            <ServiceFormDialog />
          </div>
        </div>
      )}

      {/* No search results */}
      {services.length > 0 && filtered.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No services match &ldquo;{search}&rdquo;
          </p>
        </div>
      )}

      {/* Favourites section */}
      <AnimatePresence initial={false}>
        {favourites.length > 0 && (
          <motion.div
            key="favourites"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-1.5 px-1">
              <Star className="size-3.5 fill-amber-500 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Favourites
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {favourites.map((p) => (
                <ServiceCard key={p.id} partner={p} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* By category */}
      {byCategory.length > 0 && (
        <div className="space-y-1">
          {favourites.length > 0 && (
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              All services
            </p>
          )}
          {byCategory.map(({ category, items }) => {
            const isOpen = openSections[category] !== false;
            return (
              <Collapsible
                key={category}
                open={isOpen}
                onOpenChange={(v) =>
                  setOpenSections((prev) => ({ ...prev, [category]: v }))
                }
              >
                <CollapsibleTrigger className="flex w-full items-center gap-2 px-1 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/50 rounded transition-colors cursor-pointer">
                  <ChevronDown
                    className={`size-3.5 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  />
                  {category}
                  <span className="font-normal">({items.length})</span>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 pb-2 pl-1">
                    {items.map((p) => (
                      <ServiceCard key={p.id} partner={p} />
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
