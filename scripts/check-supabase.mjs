/**
 * Verifies a Supabase connection end to end: credentials, table, and a real
 * insert/read/delete round trip.
 *
 * Run after setting SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY:
 *   npm run supabase:check
 *
 * The test row it writes is deleted before the script exits.
 */

import { readFileSync } from "node:fs";

// Load .env.local the same way Next does, so the check sees what the app sees.
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
} catch {
  // No .env.local — fall back to whatever is already in the environment.
}

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TABLE = "survey_responses";

const ok = (m) => console.log(`  \x1b[32m✓\x1b[0m ${m}`);
const bad = (m, detail) => {
  console.log(`  \x1b[31m✗\x1b[0m ${m}`);
  if (detail) console.log(`    ${String(detail).split("\n")[0]}`);
  process.exitCode = 1;
};

console.log("\nChecking Supabase connection\n");

if (!URL_ || !KEY) {
  bad("Environment variables", `Missing ${[!URL_ && "SUPABASE_URL", !KEY && "SUPABASE_SERVICE_ROLE_KEY"].filter(Boolean).join(" and ")}`);
  console.log("\n  Set them in .env.local (local) or Vercel → Settings → Environment Variables.\n");
  process.exit(1);
}
ok(`Environment variables set (${URL_})`);

if (KEY.length < 40) {
  bad("Service role key looks too short — did you paste the anon key by mistake?");
}

const endpoint = `${URL_.replace(/\/+$/, "")}/rest/v1/${TABLE}`;
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

// 1. Can we reach the table at all?
let res;
try {
  res = await fetch(`${endpoint}?select=id&limit=1`, { headers });
} catch (error) {
  bad("Could not reach Supabase", error.message);
  process.exit(1);
}

if (res.status === 401 || res.status === 403) {
  bad(`Rejected (${res.status}) — the key is wrong, or it is the anon key rather than the service role key`);
  process.exit(1);
}
if (res.status === 404) {
  bad(`Table "${TABLE}" does not exist — run supabase/schema.sql in the Supabase SQL editor`);
  process.exit(1);
}
if (!res.ok) {
  bad(`Unexpected response (${res.status})`, await res.text());
  process.exit(1);
}
ok(`Table "${TABLE}" is reachable`);

// 2. Round trip a real row.
const marker = `connection-check-${Date.now()}`;
const insert = await fetch(endpoint, {
  method: "POST",
  headers: { ...headers, Prefer: "return=representation" },
  body: JSON.stringify({
    survey_id: marker,
    version: "connection-check",
    language: "en",
    submitted_at: new Date().toISOString(),
    received_at: new Date().toISOString(),
    answers: { check: marker },
  }),
});

if (!insert.ok) {
  bad(`Insert failed (${insert.status})`, await insert.text());
  process.exit(1);
}
const [row] = await insert.json();
ok(`Wrote a test row (id ${row.id})`);

const read = await fetch(`${endpoint}?select=*&id=eq.${row.id}`, {
  headers: { ...headers, Prefer: "count=exact" },
});
const [readBack] = await read.json();
if (readBack?.answers?.check === marker) ok("Read it back correctly");
else bad("Read back did not match what was written");
if (read.headers.get("content-range")) ok("Row counting works (needed for paging)");
else bad("No Content-Range header — paging totals will be wrong");

const del = await fetch(`${endpoint}?id=eq.${row.id}`, { method: "DELETE", headers });
if (del.ok) ok("Cleaned up the test row");
else bad(`Could not delete the test row ${row.id} — remove it manually`);

// 3. How many real responses are already stored?
const count = await fetch(`${endpoint}?select=id&limit=1`, { headers: { ...headers, Prefer: "count=exact" } });
const total = count.headers.get("content-range")?.split("/")[1];
console.log(`\n  Stored responses: ${total ?? "unknown"}`);
console.log(process.exitCode ? "\n\x1b[31mSome checks failed.\x1b[0m\n" : "\n\x1b[32mSupabase is ready.\x1b[0m\n");
