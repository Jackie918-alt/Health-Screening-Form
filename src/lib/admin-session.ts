/**
 * The Data Access Layer for admin pages.
 *
 * Next's own guidance is that the Proxy is an optimistic check only — it never
 * touches data and can be bypassed by any request that reaches a route
 * directly. So every page and handler that reads responses calls `requireAdmin`
 * here, as close to the data as possible.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySession } from "./admin-auth";

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return verifySession(store.get(ADMIN_COOKIE)?.value);
}

/** Redirects to the login page unless the caller holds a valid session. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
