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
import { DuplicateResponseError, normaliseNric } from "./nric";
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
            deletedAt: parsed.deletedAt ?? null,
          } satisfies SurveyResponse,
        ];
      } catch {
        return []; // Skip a corrupt line rather than fail the whole listing.
      }
    });
}

function matches(row: SurveyResponse, { search, language, deleted }: ListOptions): boolean {
  if (Boolean(row.deletedAt) !== Boolean(deleted)) return false;
  if (language && row.language !== language) return false;
  if (!search) return true;
  return JSON.stringify(row.answers).toLowerCase().includes(search.toLowerCase());
}

/** Rewrites every line through `change`. Only the dev store needs this. */
async function rewrite(change: (row: SurveyResponse) => SurveyResponse): Promise<void> {
  const rows = (await readAll()).map(change);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, rows.map((r) => `${JSON.stringify(r)}\n`).join(""), "utf8");
}

export function createFileStore(): ResponseStore {
  return {
    driver: "file",
    note: "Responses are stored in a local file. Not durable on Vercel — connect Supabase before launch.",

    async save(record: NewResponse) {
      const nric = normaliseNric(record.answers.nric);
      if (nric && (await this.findByNric(nric))) throw new DuplicateResponseError();

      const saved: SurveyResponse = { id: randomUUID(), ...record, deletedAt: null };
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

    async findByNric(nric: string) {
      const digits = normaliseNric(nric);
      if (!digits) return null;
      const all = await readAll();
      // A binned response does not hold its NRIC.
      return (
        all.find((row) => !row.deletedAt && normaliseNric(row.answers.nric) === digits)?.id ?? null
      );
    },

    // The file store is append-only, so a state change means rewriting the
    // whole file. Fine for a development store; Supabase does this in place.
    async softDelete(id: string) {
      await rewrite((row) =>
        row.id === id ? { ...row, deletedAt: new Date().toISOString() } : row,
      );
    },

    async restore(id: string) {
      await rewrite((row) => (row.id === id ? { ...row, deletedAt: null } : row));
    },

    async all() {
      const all = (await readAll()).filter((row) => !row.deletedAt);
      all.sort((a, b) => a.receivedAt.localeCompare(b.receivedAt));
      return all;
    },
  };
}
