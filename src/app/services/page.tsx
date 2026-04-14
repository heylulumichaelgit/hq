"use client";

import { useEffect } from "react";
import { Settings2 } from "lucide-react";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { ProfileAvatarSyncCard } from "@/features/auth/components/profile-avatar-sync-card";
import { FirstRunCard } from "@/features/onboarding/components/first-run-card";

export default function ServicesPage() {
  const { setSlot } = useHeaderSlot();

  useEffect(() => {
    setSlot(
      <>
        <div className="flex items-center gap-2 shrink-0">
          <Settings2 className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Settings</span>
        </div>
        <div className="flex-1" />
      </>
    );
    return () => setSlot(null);
  }, [setSlot]);

  return (
    <div className="space-y-6 pb-8">
      <FirstRunCard />
      <ProfileAvatarSyncCard />
    </div>
  );
}
