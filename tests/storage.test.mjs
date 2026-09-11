/**
 * The Supabase storage driver.
 *
 * Runs against a local mock of PostgREST by default. `npm test -- --live` runs
 * the identical assertions against the real Supabase project in the
 * environment, and deletes every row it writes.
 */

import { harness } from "./assert.mjs";
import { startMock } from "./mock-postgrest.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const live = process.argv.includes("--live");
const { check, done } = harness("storage");

let url, key, mock;
if (live) {
  url = process.env.SUPABASE_URL;
  key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("  \x1b[31m✗\x1b[0m --live needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  console.log(`  (live: ${url})`);
} else {
  mock = await startMock();
  url = `http://localhost:${mock.port}`;
  key = "test-service-key";
}

const { createSupabaseStore } = await import(path.join(root, "src/lib/responses/supabase-store.ts"));
const store = createSupabaseStore(url, key);

// Tagged so a live run can find and remove exactly its own rows.
const TAG = `test-${Date.now()}`;
const written = [];

async function seed(language, answers, submittedAt) {
  const row = await store.save({
    surveyId: TAG,
    version: "test",
    language,
    submittedAt,
    receivedAt: submittedAt,
    answers,
  });
  written.push(row.id);
  return row;
}

try {
  check("the driver identifies itself", store.driver, "supabase");

  const first = await seed("en", { agent_name: "Aisyah", anything_else: "Commission payouts are late." },
    "2026-09-20T02:00:00.000Z");
  check("save returns a database-generated id", typeof first.id === "string" && first.id.length > 10);
  check("save round-trips the answers", first.answers.agent_name, "Aisyah");

  const second = await seed("ms", { agent_name: "Farid", anything_else: "Latihan produk kurang." },
    "2026-09-21T02:00:00.000Z");

  const mine = (rows) => rows.filter((r) => r.surveyId === TAG);

  const listed = await store.list({ limit: 50, offset: 0 });
  check("both rows come back", mine(listed.rows).length, 2);
  check("newest first", mine(listed.rows)[0].id, second.id);
  check("the total is a real count, not the page size", listed.total >= 2);

  const paged = await store.list({ limit: 1, offset: 0 });
  check("a page holds one row", paged.rows.length, 1);
  check("paging still reports the full total", paged.total >= 2);

  const byLang = await store.list({ limit: 50, offset: 0, language: "en" });
  check("the language filter excludes the other language",
    mine(byLang.rows).every((r) => r.language === "en") && mine(byLang.rows).length, 1);

  const found = await store.list({ limit: 50, offset: 0, search: "payouts are late" });
  check("search matches text inside the answers", mine(found.rows).length, 1);
  check("search returns the right row", mine(found.rows)[0]?.id, first.id);

  const missed = await store.list({ limit: 50, offset: 0, search: "no-such-text-anywhere-xyz" });
  check("search with no match returns nothing", mine(missed.rows).length, 0);

  const one = await store.get(first.id);
  check("get by id returns that row", one.answers.agent_name, "Aisyah");
  check("get with an unknown id returns null",
    await store.get("00000000-0000-0000-0000-000000000000"), null);

  const all = await store.all();
  check("all returns every row, oldest first", mine(all).map((r) => r.id), [first.id, second.id]);

  // ── One response per NRIC ─────────────────────────────────────────────────
  const { DuplicateResponseError } = await import(path.join(root, "src/lib/responses/nric.ts"));
  const nric = String(Date.now()).padStart(12, "9").slice(-12);

  const original = await seed("en", { agent_name: "First", nric }, "2026-09-23T02:00:00.000Z");
  check("the first response for an NRIC is accepted", typeof original.id, "string");
  check("findByNric locates it", await store.findByNric(nric), original.id);

  try {
    await seed("en", { agent_name: "Second", nric }, "2026-09-24T02:00:00.000Z");
    check("a second response for the same NRIC is refused", false);
  } catch (error) {
    check("a second response for the same NRIC is refused",
      error instanceof DuplicateResponseError);
  }

  const other = String(Number(nric) - 1).padStart(12, "0").slice(-12);
  check("a different NRIC is not treated as a duplicate", await store.findByNric(other), null);
  check("findByNric ignores a malformed NRIC", await store.findByNric("123"), null);

  const stillOne = await store.list({ limit: 50, offset: 0, search: nric });
  check("only one row exists for that NRIC", mine(stillOne.rows).length, 1);

  const badKey = createSupabaseStore(url, "definitely-not-the-key");
  try {
    await badKey.list({ limit: 1, offset: 0 });
    check("a rejected key raises an error", false);
  } catch (error) {
    check("a rejected key raises an error naming the status", /40[13]/.test(error.message));
  }
} finally {
  // Live runs must not leave test rows in the real table.
  if (live) {
    for (const id of written) {
      await fetch(`${url.replace(/\/+$/, "")}/rest/v1/survey_responses?id=eq.${id}`, {
        method: "DELETE",
        headers: { apikey: key, Authorization: `Bearer ${key}` },
      });
    }
    console.log(`  (cleaned up ${written.length} test rows)`);
  }
  mock?.server.close();
}

done();
