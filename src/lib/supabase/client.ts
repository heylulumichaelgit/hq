"use client";

import { createBrowserClient } from "@supabase/ssr";

// @supabase/ssr@0.8.0 already creates a singleton internally and sets
// maxAge: 400 days on cookies by default. No overrides needed.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
