/** Login rate limiting. */

import { harness } from "./assert.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const t = await import(path.join(root, "src/lib/login-throttle.ts"));
const { check, done } = harness("throttle");

t.resetThrottle();

check("a fresh client is not blocked", t.checkThrottle("1.1.1.1").blocked, false);
check("a fresh client has five attempts", t.checkThrottle("1.1.1.1").remaining, 5);

for (let i = 1; i <= 4; i += 1) t.recordFailure("1.1.1.1");
check("four failures leave one attempt", t.checkThrottle("1.1.1.1").remaining, 1);
check("four failures do not block", t.checkThrottle("1.1.1.1").blocked, false);

t.recordFailure("1.1.1.1");
check("the fifth failure blocks", t.checkThrottle("1.1.1.1").blocked, true);
check("a blocked client is told when to return", t.checkThrottle("1.1.1.1").retryInMinutes > 0, true);

check("another client is unaffected", t.checkThrottle("2.2.2.2").blocked, false);

t.clearFailures("1.1.1.1");
check("a correct password clears the record", t.checkThrottle("1.1.1.1").blocked, false);
check("and restores the full allowance", t.checkThrottle("1.1.1.1").remaining, 5);

// Everything behind a proxy with no forwarded header shares one bucket; that is
// intended, but it must still work rather than throw.
for (let i = 0; i < 6; i += 1) t.recordFailure("unknown");
check("the shared fallback bucket blocks too", t.checkThrottle("unknown").blocked, true);

done();
