import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

/**
 * A stand-in for Supabase's PostgREST, faithful to the parts the driver uses:
 * service-role auth headers, `Prefer: return=representation` on insert,
 * `Prefer: count=exact` -> Content-Range, and eq/ilike/order/limit/offset.
 */
export function startMock(rows = []) {
  const requests = [];

  const server = createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    requests.push({ method: req.method, path: url.pathname, query: url.searchParams, headers: req.headers });

    // Reject anything not carrying the service-role key, exactly as Supabase would.
    if (req.headers.apikey !== "test-service-key" || req.headers.authorization !== "Bearer test-service-key") {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: "No API key found in request" }));
    }
    if (url.pathname !== "/rest/v1/survey_responses") {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ message: `relation does not exist: ${url.pathname}` }));
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        const incoming = JSON.parse(body);

        // Mirror the unique index on (answers->>'nric'): Postgres answers 409
        // with SQLSTATE 23505, and the driver depends on recognising that.
        const nric = incoming.answers?.nric;
        if (nric && rows.some((r) => r.answers?.nric === nric)) {
          res.writeHead(409, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            code: "23505",
            message: `duplicate key value violates unique constraint "survey_responses_nric_unique"`,
          }));
        }

        const row = { id: randomUUID(), received_at: new Date().toISOString(), ...incoming };
        rows.push(row);
        const wantsRow = String(req.headers.prefer ?? "").includes("return=representation");
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify(wantsRow ? [row] : []));
      });
      return;
    }

    if (req.method === "DELETE") {
      const id = (url.searchParams.get("id") || "").replace("eq.", "");
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows.splice(i, 1);
      res.writeHead(204); return res.end();
    }

    // GET
    let result = [...rows];
    for (const [key, value] of url.searchParams) {
      if (["select", "order", "limit", "offset"].includes(key)) continue;
      if (value.startsWith("eq.")) {
        const want = value.slice(3);
        // `answers->>nric` reads a key out of the jsonb column, as PostgREST does.
        const json = key.match(/^(\w+)->>(\w+)$/);
        result = json
          ? result.filter((r) => String(r[json[1]]?.[json[2]] ?? "") === want)
          : result.filter((r) => String(r[key]) === want);
      } else if (value.startsWith("ilike.")) {
        // Real PostgREST cannot cast jsonb to text in a filter; it answers
        // 42883. Rejecting it here too stops the mock from blessing a query
        // the database would refuse.
        if (key.includes("::")) {
          res.writeHead(404, { "Content-Type": "application/json" });
          return res.end(JSON.stringify({
            code: "42883",
            message: "operator does not exist: jsonb ~~* unknown",
          }));
        }
        const needle = value.slice(6).replaceAll("*", "").toLowerCase();
        result = result.filter((r) => JSON.stringify(r[key] ?? "").toLowerCase().includes(needle));
      }
    }

    const order = url.searchParams.get("order");
    if (order) {
      const [field, dir] = order.split(".");
      result.sort((a, b) => String(a[field]).localeCompare(String(b[field])) * (dir === "desc" ? -1 : 1));
    }

    const total = result.length;
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const limit = url.searchParams.get("limit");
    const page = limit ? result.slice(offset, offset + Number(limit)) : result.slice(offset);

    const headers = { "Content-Type": "application/json" };
    if (String(req.headers.prefer ?? "").includes("count=exact")) {
      headers["Content-Range"] = `${offset}-${offset + Math.max(page.length - 1, 0)}/${total}`;
    }
    res.writeHead(200, headers);
    res.end(JSON.stringify(page));
  });

  return new Promise((resolve) => {
    server.listen(0, () => resolve({ port: server.address().port, server, rows, requests }));
  });
}
