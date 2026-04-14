import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const GET_USER_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`middleware.getUser timed out after ${ms}ms`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function isAuthPath(pathname: string): boolean {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/api/")
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          // Pass cookie options through unmodified — @supabase/ssr@0.8.0
          // already sets maxAge: 400 days. Previously we were overriding
          // the library's maxAge: 0 (for chunk removal) which corrupted sessions.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT and triggers token refresh if expired.
  // Race it against a deadline so a hung upstream doesn't wedge the edge.
  // On timeout we fall through without treating the request as signed-out —
  // the client-side AuthProvider will handle redirect if the session is
  // actually gone. This is strictly better than the old "hang for 30s until
  // Vercel kills the edge function" behavior, even though it means a brief
  // stale render on the next request if Supabase was actually down.
  let user = null;
  try {
    const result = await withTimeout(
      supabase.auth.getUser(),
      GET_USER_TIMEOUT_MS
    );
    user = result.data.user;
  } catch (error) {
    console.error(
      `[middleware] getUser failed for ${request.nextUrl.pathname}:`,
      error
    );
    if (!isAuthPath(request.nextUrl.pathname)) {
      return supabaseResponse;
    }
  }

  if (!user && !isAuthPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
