"use client";

import { useEffect } from "react";
import { Settings2 } from "lucide-react";
import { useHeaderSlot } from "@/components/layout/header-slot-context";
import { ProfileAvatarSyncCard } from "@/features/auth/components/profile-avatar-sync-card";
import { FirstRunCard } from "@/features/onboarding/components/first-run-card";

export default function ServicesPage() {
  const { setHeader } = useHeaderSlot();

  useEffect(() => {
    setHeader({
      title: "Settings",
      subtitle: "Setup and account",
      actions: <Settings2 className="size-4 text-muted-foreground" />,
    });
    return () => setHeader(null);
  }, [setHeader]);

  return (
    <div className="space-y-6 pb-8">
      <FirstRunCard />
      <ProfileAvatarSyncCard />
    </div>
  );
}
