import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

// Deliberately using the deprecated `middleware.ts`/`middleware` convention
// instead of Next.js 16's `proxy.ts`: Next 16's proxy always runs on the
// Node.js runtime, which @opennextjs/cloudflare (our deploy target) doesn't
// support yet ("Node.js middleware is not currently supported" build error).
// middleware.ts still runs on the Edge runtime, which OpenNext does support.
// Revisit once https://github.com/opennextjs/opennextjs-cloudflare/issues/962
// lands and switch back to proxy.ts.
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt
     * - image/font files
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
