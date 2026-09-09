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

export function createSupabaseStore(url: string, serviceKey: string): ResponseStore {
  const endpoint = `${url.replace(/\/+$/, "")}/rest/v1/${TABLE}`;
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
      const params = new URLSearchParams({
        select: "*",
        order: "received_at.desc",
        limit: String(limit),
        offset: String(offset),
      });
      if (language) params.set("language", `eq.${language}`);
      // Match anywhere in the serialised answers — good enough for an admin
      // lookup, and it keeps the filter in the database rather than pulling
      // every row across the wire to grep it here.
      if (search) params.set("answers::text", `ilike.*${search}*`);

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
