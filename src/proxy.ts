import { NextResponse, type NextRequest } from "next/server";
import { ROLE_HOME, ROLE_PREFIX, SESSION_COOKIE, verifySession } from "@/lib/auth/token";
import type { Role } from "@/lib/domain/types";

/**
 * Route protection: every /app, /bank and /admin request must carry a valid
 * signed session whose role matches the portal. Layouts re-check with
 * `requireRole` (defense in depth).
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  const required = (Object.keys(ROLE_PREFIX) as Role[]).find(
    (r) => pathname === ROLE_PREFIX[r] || pathname.startsWith(ROLE_PREFIX[r] + "/"),
  );
  if (required && required !== session.role) {
    return NextResponse.redirect(new URL(ROLE_HOME[session.role], request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*", "/bank/:path*", "/admin/:path*", "/app", "/bank", "/admin"],
};
