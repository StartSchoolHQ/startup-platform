import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { Database } from "../../types/database";
import { classifyRoute } from "./route-classification";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
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

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { isPublic, isProtected, isScholarshipPublic } = classifyRoute(
    request.nextUrl.pathname
  );

  // Hidden public scholarship pages + the privacy notice: noindex +
  // no-referrer so the URLs don't leak into search engines or
  // third-party Referer headers.
  if (isScholarshipPublic) {
    supabaseResponse.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive"
    );
    supabaseResponse.headers.set("Referrer-Policy", "no-referrer");
  }

  // Public routes need no auth check. /login stays reachable for signed-in
  // users so a legacy password user can link their Google account.
  if (isPublic) {
    return supabaseResponse;
  }

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse;
}
