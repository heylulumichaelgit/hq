"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FamilyAvatar } from "@/components/family-avatar";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/features/auth/store";
import { toast } from "sonner";

export function ProfileAvatarSyncCard() {
  const { user, profile, setProfile } = useAuthStore();
  const [isSyncing, setIsSyncing] = useState(false);

  if (!user || !profile) return null;

  const syncFromGoogle = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/profile/avatar-sync", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Failed to sync avatar");
      }

      setProfile(payload.profile);

      const supabase = createClient();
      await supabase.auth.refreshSession();

      toast.success(`Avatar synced from ${payload.source}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to sync avatar");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Profile avatar</CardTitle>
        <CardDescription>
          Pull your photo from a connected Google account. WhatsApp profile photos are not reliably accessible here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <FamilyAvatar
            name={profile.display_name}
            avatarUrl={profile.avatar_url}
            className="h-12 w-12 rounded-xl"
            fallbackClassName="rounded-xl text-base font-bold"
          />
          <div className="min-w-0">
            <p className="font-medium truncate">{profile.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile.email}</p>
          </div>
        </div>
        <Button size="sm" onClick={syncFromGoogle} disabled={isSyncing} className="gap-2 shrink-0">
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync from Google
        </Button>
      </CardContent>
    </Card>
  );
}
