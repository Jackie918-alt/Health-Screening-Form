/**
 * Test runner: `npm test`.
 *
 * No framework — Node's own type stripping runs the TypeScript sources
 * directly, so the suite has no dependencies to install or keep current.
 *
 * The Supabase suite runs against a local mock of PostgREST by default. Point
 * it at the real thing with `npm test -- --live`, which uses SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY and cleans up every row it writes.
 */

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const suites = readdirSync(here).filter((f) => f.endsWith(".test.mjs")).sort();

let failed = 0;
for (const suite of suites) {
  console.log(`\n\x1b[1m${suite.replace(".test.mjs", "")}\x1b[0m`);
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--no-warnings",
      "--import",
      path.join(here, "register.mjs"),
      path.join(here, suite),
      ...process.argv.slice(2),
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) failed += 1;
}

console.log(
  failed === 0
    ? `\n\x1b[32mAll ${suites.length} suites passed.\x1b[0m\n`
    : `\n\x1b[31m${failed} of ${suites.length} suites failed.\x1b[0m\n`,
);
process.exit(failed === 0 ? 0 : 1);
