import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/google-calendar";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  // Generate a random CSRF state token
  const state = crypto.randomBytes(16).toString("hex");

  // Store state in a short-lived cookie for verification on callback
  const cookieStore = await cookies();
  cookieStore.set("gcal_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  const authUrl = getAuthUrl(state);
  return NextResponse.redirect(authUrl);
}
