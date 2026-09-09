/**
 * JSON Lines on the local disk — the development fallback.
 *
 * Append-only: one response per line, so a half-written line can never corrupt
 * the rows before it. This is NOT durable on a serverless host such as Vercel,
 * where the filesystem is per-container and vanishes on redeploy; the admin UI
 * says so plainly whenever this driver is the one serving.
 */

import { createHash, randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Lang } from "../i18n";
import type { ListOptions, NewResponse, ResponseStore, SurveyResponse } from "./types";

const FILE = path.join(process.cwd(), "data", "responses.jsonl");

async function readAll(): Promise<SurveyResponse[]> {
  let raw: string;
  try {
    raw = await fs.readFile(FILE, "utf8");
  } catch {
    return []; // No file yet — no responses yet.
  }

  return raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .flatMap((line, index) => {
      try {
        const parsed = JSON.parse(line) as Partial<SurveyResponse>;
        return [
          {
            // Rows written before this store existed have no id; derive a
            // stable one from the line itself so detail links keep working.
            id: parsed.id ?? createHash("sha1").update(`${index}:${line}`).digest("hex").slice(0, 12),
            surveyId: parsed.surveyId ?? "",
            version: parsed.version ?? "",
            language: (parsed.language === "ms" ? "ms" : "en") as Lang,
            submittedAt: parsed.submittedAt ?? "",
            receivedAt: parsed.receivedAt ?? parsed.submittedAt ?? "",
            answers: parsed.answers ?? {},
          } satisfies SurveyResponse,
        ];
      } catch {
        return []; // Skip a corrupt line rather than fail the whole listing.
      }
    });
}

function matches(row: SurveyResponse, { search, language }: ListOptions): boolean {
  if (language && row.language !== language) return false;
  if (!search) return true;
  return JSON.stringify(row.answers).toLowerCase().includes(search.toLowerCase());
}

export function createFileStore(): ResponseStore {
  return {
    driver: "file",
    note: "Responses are stored in a local file. Not durable on Vercel — connect Supabase before launch.",

    async save(record: NewResponse) {
      const saved: SurveyResponse = { id: randomUUID(), ...record };
      await fs.mkdir(path.dirname(FILE), { recursive: true });
      await fs.appendFile(FILE, `${JSON.stringify(saved)}\n`, "utf8");
      return saved;
    },

    async list(options: ListOptions) {
      const all = await readAll();
      const filtered = all.filter((row) => matches(row, options));
      // Newest first, matching the Supabase driver's ordering.
      filtered.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
      return {
        rows: filtered.slice(options.offset, options.offset + options.limit),
        total: filtered.length,
      };
    },

    async get(id: string) {
      const all = await readAll();
      return all.find((row) => row.id === id) ?? null;
    },

    async all() {
      const all = await readAll();
      all.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
      return all;
    },
  };
}
