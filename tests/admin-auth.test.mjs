/** Admin session signing: what must be accepted, and what must never be. */

import { harness } from "./assert.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SECRET = "test-secret-for-the-suite-only-000000";

process.env.ADMIN_PASSWORD = "correct-horse";
process.env.ADMIN_SESSION_SECRET = SECRET;

const auth = await import(path.join(root, "src/lib/admin-auth.ts"));
const { check, done } = harness("admin-auth");

check("configured when both variables are set", auth.isAdminConfigured());
check("the right password is accepted", auth.verifyPassword("correct-horse"));
check("a wrong password is rejected", auth.verifyPassword("wrong-horse"), false);
check("an empty password is rejected", auth.verifyPassword(""), false);
check("a prefix of the password is rejected", auth.verifyPassword("correct-hors"), false);
check("the password plus a suffix is rejected", auth.verifyPassword("correct-horse2"), false);

const session = await auth.createSession();
const [expiry, mac] = session.value.split(".");

check("a fresh session verifies", await auth.verifySession(session.value));
check("a session lasts eight hours", session.maxAge, 8 * 60 * 60);
check("no token is rejected", await auth.verifySession(undefined), false);
check("an empty token is rejected", await auth.verifySession(""), false);
check("a malformed token is rejected", await auth.verifySession("garbage"), false);
check("a forged signature is rejected", await auth.verifySession("9999999999.forged"), false);

// The signature covers the expiry, so a stolen cookie cannot be extended.
check("an extended expiry is rejected", await auth.verifySession(`${Number(expiry) + 99999}.${mac}`), false);
check("an expired session is rejected", await auth.verifySession(`${Math.floor(Date.now() / 1000) - 1}.${mac}`), false);

process.env.ADMIN_SESSION_SECRET = "a-different-secret-entirely-11111111";
check("a session signed with another secret is rejected", await auth.verifySession(session.value), false);

// A deployment missing its variables must fail closed, never throw on every request.
delete process.env.ADMIN_SESSION_SECRET;
delete process.env.ADMIN_PASSWORD;
check("unconfigured reports itself as unconfigured", auth.isAdminConfigured(), false);
check("unconfigured rejects every password", auth.verifyPassword("correct-horse"), false);
check("unconfigured rejects sessions without throwing", await auth.verifySession(session.value), false);
try {
  await auth.createSession();
  check("unconfigured refuses to mint a session", false);
} catch {
  check("unconfigured refuses to mint a session", true);
}

done();
