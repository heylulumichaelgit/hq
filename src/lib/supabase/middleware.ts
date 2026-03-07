import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  let supabase;
  try {
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
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  } catch (error) {
    console.error('Supabase client creation failed:', error.message);
    console.error('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.error('ANON KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    return NextResponse.json({ error: 'Supabase client creation failed' }, { status: 500 });
  }

  let user;
  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    console.error('Failed to get user:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }

  if (
    !user &&
    !request.nextUrl.pathname.startsWith("/login") &&
    !request.nextUrl.pathname.startsWith("/auth") &&
    !request.nextUrl.pathname.startsWith("/forgot-password") &&
    !request.nextUrl.pathname.startsWith("/reset-password")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
