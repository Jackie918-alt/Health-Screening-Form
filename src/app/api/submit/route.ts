import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { SURVEY } from "@/lib/survey-content";
import { pruneHiddenAnswers, validateSection, visibleSections } from "@/lib/survey-logic";
import type { Answers } from "@/lib/survey-types";

/**
 * First-draft persistence: append each response to a JSON Lines file on disk.
 *
 * TODO before launch — swap this for the real destination (SharePoint list,
 * Google Sheet, Supabase, or whichever backend the team settles on). Local
 * files do not persist on serverless hosts such as Vercel.
 */
const STORE = path.join(process.cwd(), "data", "responses.jsonl");

type Payload = {
  surveyId?: string;
  version?: string;
  language?: string;
  submittedAt?: string;
  answers?: Answers;
};

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid-json" }, { status: 400 });
  }

  // Drop anything belonging to a question the agent's answers do not reveal.
  // The browser prunes too, but the browser is not the system of record.
  const answers = pruneHiddenAnswers(SURVEY, payload.answers ?? {});

  // Re-run the same validation the client did — a browser can always be bypassed.
  const problems = visibleSections(SURVEY, answers).flatMap((section) =>
    Object.keys(validateSection(section, answers, "en", SURVEY)),
  );
  if (problems.length > 0) {
    return NextResponse.json({ ok: false, error: "validation", fields: problems }, { status: 422 });
  }

  const record = {
    surveyId: payload.surveyId ?? SURVEY.id,
    version: payload.version ?? SURVEY.version,
    language: payload.language ?? "en",
    submittedAt: payload.submittedAt ?? new Date().toISOString(),
    receivedAt: new Date().toISOString(),
    answers,
  };

  await fs.mkdir(path.dirname(STORE), { recursive: true });
  await fs.appendFile(STORE, `${JSON.stringify(record)}\n`, "utf8");

  return NextResponse.json({ ok: true });
}
