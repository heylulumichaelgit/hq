"use client";

import { createBrowserClient } from "@supabase/ssr";

let client: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // iOS standalone PWA purges session cookies on app close.
        // Setting maxAge ensures cookies persist across launches.
        maxAge: 60 * 60 * 24 * 400, // 400 days (max allowed by browsers)
        path: "/",
        sameSite: "lax",
        secure: true,
      },
    }
  );
  return client;
}
