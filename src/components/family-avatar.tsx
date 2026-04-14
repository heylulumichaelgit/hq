"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const PERSON_META: Record<string, { fallback: string; colors: string }> = {
  Andrew: {
    fallback: "A",
    colors: "bg-stone-200 dark:bg-stone-700/50 text-stone-700 dark:text-stone-300",
  },
  Chrystalla: {
    fallback: "C",
    colors: "bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
  },
  Lulu: {
    fallback: "L",
    colors: "bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300",
  },
};

export function familyAvatarMeta(name?: string | null) {
  const key = name?.trim() || "";
  const meta = PERSON_META[key] ?? {
    fallback: key.charAt(0).toUpperCase() || "?",
    colors: "bg-muted text-muted-foreground",
  };
  return meta;
}

export function FamilyAvatar({
  name,
  avatarUrl,
  className,
  fallbackClassName,
}: {
  name?: string | null;
  avatarUrl?: string | null;
  className?: string;
  fallbackClassName?: string;
}) {
  const meta = familyAvatarMeta(name);

  return (
    <Avatar className={className}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={name ?? "Avatar"} /> : null}
      <AvatarFallback className={cn(meta.colors, fallbackClassName)}>
        {meta.fallback}
      </AvatarFallback>
    </Avatar>
  );
}
