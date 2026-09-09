/**
 * Slows down password guessing against `/admin/login`.
 *
 * The login page is reachable by anyone on the internet and protected by a
 * single shared password, so an unthrottled endpoint is a standing invitation
 * to guess at it.
 *
 * In-memory and therefore per-instance: a serverless host running several
 * instances lets an attacker get a few more attempts than the number below. It
 * is a speed bump, not a lock — the real protection is a long password. A
 * shared counter would need a round trip to Supabase on every attempt, which
 * buys little against an attacker who can already spread load across
 * instances. If this ever needs to be strict, move the counter into the
 * database and rate-limit at the edge as well.
 */

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

type Attempts = { count: number; firstAt: number };

const attempts = new Map<string, Attempts>();

/** Drops entries whose window has passed, so the map cannot grow unbounded. */
function sweep(now: number): void {
  for (const [key, record] of attempts) {
    if (now - record.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

export type ThrottleState = { blocked: boolean; remaining: number; retryInMinutes: number };

export function checkThrottle(key: string): ThrottleState {
  const now = Date.now();
  sweep(now);

  const record = attempts.get(key);
  if (!record) return { blocked: false, remaining: MAX_ATTEMPTS, retryInMinutes: 0 };

  const blocked = record.count >= MAX_ATTEMPTS;
  return {
    blocked,
    remaining: Math.max(0, MAX_ATTEMPTS - record.count),
    retryInMinutes: blocked ? Math.ceil((WINDOW_MS - (now - record.firstAt)) / 60000) : 0,
  };
}

export function recordFailure(key: string): ThrottleState {
  const now = Date.now();
  const record = attempts.get(key);

  // The window starts at the first failure and does not slide, so a patient
  // attacker cannot hold it open indefinitely.
  if (!record || now - record.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now });
  } else {
    record.count += 1;
  }

  return checkThrottle(key);
}

/** A correct password clears the record — an admin who mistypes twice is not punished. */
export function clearFailures(key: string): void {
  attempts.delete(key);
}

/** Test seam. */
export function resetThrottle(): void {
  attempts.clear();
}
