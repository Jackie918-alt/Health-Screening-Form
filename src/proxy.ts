/**
 * Optimistic gate for `/admin`.
 *
 * Renamed from `middleware.ts` in Next 16. This only reads the cookie — the
 * real authorisation happens in the Data Access Layer next to the data
 * (`src/lib/admin-session.ts`), per Next's authentication guidance.
 */

import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySession } from "@/lib/admin-auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifySession(token)) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  // Bounce back to the page they wanted once they are through the login.
  login.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything under /admin except the login page itself.
  matcher: ["/admin", "/admin/((?!login).*)"],
};
