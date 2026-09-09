/**
 * Admin session handling.
 *
 * A single shared password (`ADMIN_PASSWORD`) exchanged for a signed, HTTP-only
 * cookie. Deliberately small: the survey itself stays completely open — no
 * account, no login, nothing between an agent and the form — and only the
 * response data behind `/admin` is gated.
 *
 * When Supabase Auth lands, replace `verifyPassword` and `createSession` with
 * Supabase's session handling. Every caller goes through `isAdmin()` /
 * `requireAdmin()`, so nothing else needs to change.
 *
 * Signing uses Web Crypto rather than `node:crypto` so the same helpers run in
 * the Proxy (edge runtime) and in Route Handlers (node runtime).
 */

export const ADMIN_COOKIE = "wk_admin_session";

/** Eight hours — a working day, so an admin is not re-prompted mid-task. */
const SESSION_SECONDS = 8 * 60 * 60;

function secret(): string | null {
  return process.env.ADMIN_SESSION_SECRET ?? null;
}

function base64url(bytes: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sign(payload: string, key0: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key0),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return base64url(mac);
}

/** Constant-time compare, so a wrong guess leaks nothing through timing. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET);
}

export function verifyPassword(candidate: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return safeEqual(candidate, expected);
}

/** Cookie value: `<expiry epoch seconds>.<hmac>`. Stateless — no session table. */
export async function createSession(): Promise<{ value: string; maxAge: number }> {
  const key = secret();
  if (!key) throw new Error("ADMIN_SESSION_SECRET is not set.");
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  return { value: `${expires}.${await sign(String(expires), key)}`, maxAge: SESSION_SECONDS };
}

export async function verifySession(token: string | undefined): Promise<boolean> {
  // No secret configured means no valid session can exist. Failing closed here
  // keeps a deployment that is missing its environment variables at "signed
  // out" rather than throwing on every single request to /admin.
  const key = secret();
  if (!key || !token) return false;

  const [expires, mac] = token.split(".");
  if (!expires || !mac) return false;
  if (Number(expires) * 1000 < Date.now()) return false; // Expired.
  return safeEqual(mac, await sign(expires, key));
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
} as const;
