"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSession,
  isAdminConfigured,
  verifyPassword,
} from "@/lib/admin-auth";
import { checkThrottle, clearFailures, recordFailure } from "@/lib/login-throttle";

export type LoginState = { error?: string };

/** Throttle per client IP, falling back to one shared bucket behind a proxy. */
async function clientKey(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headerList.get("x-real-ip") || "unknown";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return { error: "Admin access is not configured on this deployment." };
  }

  const key = await clientKey();
  const throttle = checkThrottle(key);
  if (throttle.blocked) {
    return {
      error: `Too many attempts. Try again in ${throttle.retryInMinutes} minute${
        throttle.retryInMinutes === 1 ? "" : "s"
      }.`,
    };
  }

  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    const next = recordFailure(key);
    // Same message however wrong the guess was — nothing here should hint at
    // how close it came.
    return {
      error: next.remaining > 0
        ? `Incorrect password. ${next.remaining} attempt${next.remaining === 1 ? "" : "s"} left.`
        : `Too many attempts. Try again in ${next.retryInMinutes} minutes.`,
    };
  }

  clearFailures(key);

  const session = await createSession();
  const store = await cookies();
  store.set(ADMIN_COOKIE, session.value, { ...SESSION_COOKIE_OPTIONS, maxAge: session.maxAge });

  const target = String(formData.get("next") ?? "/admin");
  // Only ever bounce to our own admin area, so a crafted `next` cannot turn the
  // login into an open redirect.
  redirect(target.startsWith("/admin") ? target : "/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
