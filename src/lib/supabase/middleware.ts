import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  let supabase;
  try {
    const cookieOptions = {
      maxAge: 60 * 60 * 24 * 400, // 400 days — survive iOS standalone PWA close
      path: "/",
      sameSite: "lax" as const,
      secure: true,
    };

    supabase = createServerClient(
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
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...cookieOptions,
              ...options,
            })
          );
        },
      },
    }
  );

  } catch (error) {
    if (error instanceof Error) {
      console.error('Supabase client creation failed:', error.message);
    } else {
      console.error('Unknown error:', error);
    }
    console.error('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.error('ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return NextResponse.json({ error: 'Supabase client creation failed' }, { status: 500 });
  }

  // IMPORTANT: getUser() validates the JWT server-side and — crucially —
  // triggers a token refresh via setAll() if the access token has expired.
  // We MUST use the response that contains the refreshed cookie values.
  // Previously this was redirecting to /login when the access token was
  // expired but the refresh token was still valid, causing spurious logouts.
  const { data: { user }, error } = await supabase.auth.getUser();

  if (
    !user &&
    !error?.message?.includes("refresh_token") && // don't redirect on transient refresh failures
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/forgot-password") &&
    !request.nextUrl.pathname.startsWith("/reset-password") &&
    !request.nextUrl.pathname.startsWith("/api/")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
