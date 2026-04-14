"use client";

import { useEffect } from "react";
import { Link2 } from "lucide-react";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { ProfileAvatarSyncCard } from "@/features/auth/components/profile-avatar-sync-card";

export default function ServicesPage() {
  const { setSlot } = useHeaderSlot();

  useEffect(() => {
    setSlot(
      <>
        <div className="flex items-center gap-2 shrink-0">
          <Link2 className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Services</span>
        </div>
        <div className="flex-1" />
      </>
    );
    return () => setSlot(null);
  }, [setSlot]);

  return (
    <div className="space-y-6 pb-8">
      <ProfileAvatarSyncCard />
    </div>
  );
}
