import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

// Paths reachable without a signed-in session. Everything else is
// protected by default — safer than an ever-growing "protected" allowlist
// as new authenticated routes get added in later phases.
const PUBLIC_PATHS = ["/", "/login", "/signup", "/auth/confirm"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path);
}

/**
 * Refreshes the Supabase auth session on every request so server components
 * always see an up-to-date/non-expired session, and enforces the
 * signed-in/signed-out split between protected app routes and the public
 * marketing/auth routes. Called from the root middleware.ts. Does not
 * enforce anything beyond that split (the PT-review gate and other
 * per-record authorization checks live in the route handlers/pages that
 * need them, not here).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refreshes the session if expired. Required for Server Components, which
  // can't write cookies themselves.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  // API routes are called by fetch(), not navigated to — redirecting them
  // to an HTML login page breaks the client's expectation of a JSON
  // response. Each API route does its own auth check and returns a proper
  // 401, so just let unauthenticated API requests through to that.
  const isApiRoute = pathname.startsWith("/api/");

  if (!user && !isApiRoute && !isPublicPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/onboarding/intake", request.url));
  }

  return supabaseResponse;
}
