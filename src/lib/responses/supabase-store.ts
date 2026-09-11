/**
 * Supabase-backed storage, spoken over PostgREST with plain `fetch`.
 *
 * Deliberately no `@supabase/supabase-js`: the six calls below are the whole
 * surface we need, and skipping the SDK keeps the dependency tree at zero
 * runtime packages. Swapping the SDK in later means rewriting this file only —
 * nothing else imports it directly.
 *
 * The service-role key bypasses row-level security, so this module must never
 * reach the browser. The guard below turns a bad import into a loud crash
 * instead of a silently shipped admin key.
 */

if (typeof window !== "undefined") {
  throw new Error("supabase-store must never be imported into client code.");
}

import type { Lang } from "../i18n";
import type { Answers } from "../survey-types";
import type { ListOptions, NewResponse, ResponseStore, SurveyResponse } from "./types";

const TABLE = "survey_responses";

type Row = {
  id: string;
  survey_id: string;
  version: string;
  language: string;
  submitted_at: string;
  received_at: string;
  answers: Answers;
};

function toResponse(row: Row): SurveyResponse {
  return {
    id: row.id,
    surveyId: row.survey_id,
    version: row.version,
    language: (row.language === "ms" ? "ms" : "en") as Lang,
    submittedAt: row.submitted_at,
    receivedAt: row.received_at,
    answers: row.answers ?? {},
  };
}

/**
 * Accepts either form of the URL Supabase shows you: the project base
 * (`https://x.supabase.co`) or the API endpoint it displays more prominently
 * (`https://x.supabase.co/rest/v1/`). Pasting the latter is the obvious
 * mistake to make, and it would otherwise fail as a 404 that looks like a
 * missing table.
 */
export function normaliseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
}

export function createSupabaseStore(url: string, serviceKey: string): ResponseStore {
  const endpoint = `${normaliseUrl(url)}/rest/v1/${TABLE}`;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
  };

  async function call(path: string, init?: RequestInit): Promise<Response> {
    const res = await fetch(`${endpoint}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers ?? {}) },
      // Responses change on every submission; a cached read would show an
      // admin stale data with no way to tell.
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Supabase ${init?.method ?? "GET"} ${TABLE} failed (${res.status}): ${detail}`);
    }
    return res;
  }

  /** PostgREST reports the unpaged total in `Content-Range: 0-9/57`. */
  function totalFrom(res: Response, fallback: number): number {
    const range = res.headers.get("content-range");
    const total = range?.split("/")[1];
    return total && total !== "*" ? Number(total) : fallback;
  }

  return {
    driver: "supabase",
    note: "Responses are stored in Supabase.",

    async save(record: NewResponse) {
      const res = await call("", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({
          survey_id: record.surveyId,
          version: record.version,
          language: record.language,
          submitted_at: record.submittedAt,
          received_at: record.receivedAt,
          answers: record.answers,
        }),
      });
      const [row] = (await res.json()) as Row[];
      return toResponse(row);
    },

    async list({ limit, offset, search, language }: ListOptions) {
      const base = new URLSearchParams({ select: "*", order: "received_at.desc" });
      if (language) base.set("language", `eq.${language}`);

      // Text search runs here rather than in the database. PostgREST cannot
      // cast jsonb to text inside a filter — `answers::text=ilike.*x*` fails
      // with "operator does not exist: jsonb ~~* unknown" — and the
      // alternative, a generated text column, is a migration this table does
      // not need at survey scale. So a search pulls the matching language's
      // rows and filters them in memory, which also keeps the total honest.
      //
      // If this table ever grows past a few thousand rows, add
      //   alter table survey_responses add column answers_text text
      //     generated always as (answers::text) stored;
      // and filter on that column instead.
      if (search) {
        const res = await call(`?${base}`);
        const all = ((await res.json()) as Row[]).map(toResponse);
        const needle = search.toLowerCase();
        const matched = all.filter((row) =>
          JSON.stringify(row.answers).toLowerCase().includes(needle),
        );
        return { rows: matched.slice(offset, offset + limit), total: matched.length };
      }

      const params = new URLSearchParams(base);
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await call(`?${params}`, { headers: { Prefer: "count=exact" } });
      const rows = (await res.json()) as Row[];
      return { rows: rows.map(toResponse), total: totalFrom(res, rows.length) };
    },

    async get(id: string) {
      const params = new URLSearchParams({ select: "*", id: `eq.${id}`, limit: "1" });
      const res = await call(`?${params}`);
      const rows = (await res.json()) as Row[];
      return rows.length > 0 ? toResponse(rows[0]) : null;
    },

    async all() {
      const params = new URLSearchParams({ select: "*", order: "received_at.asc" });
      const res = await call(`?${params}`);
      const rows = (await res.json()) as Row[];
      return rows.map(toResponse);
    },
  };
}
