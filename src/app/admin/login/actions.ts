"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSession,
  isAdminConfigured,
  verifyPassword,
} from "@/lib/admin-auth";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAdminConfigured()) {
    return { error: "Admin access is not configured on this deployment." };
  }

  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    // Same message whether or not a password was supplied — nothing here should
    // hint at how close a guess was.
    return { error: "Incorrect password." };
  }

  const session = await createSession();
  const store = await cookies();
  store.set(ADMIN_COOKIE, session.value, { ...SESSION_COOKIE_OPTIONS, maxAge: session.maxAge });

  const next = String(formData.get("next") ?? "/admin");
  // Only ever bounce to our own admin area, so a crafted `next` cannot turn the
  // login into an open redirect.
  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
