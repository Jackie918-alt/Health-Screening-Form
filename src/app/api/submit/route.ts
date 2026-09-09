import { NextResponse } from "next/server";
import type { Lang } from "@/lib/i18n";
import { getResponseStore } from "@/lib/responses";
import { SURVEY } from "@/lib/survey-content";
import { pruneHiddenAnswers, validateSection, visibleSections } from "@/lib/survey-logic";
import type { Answers } from "@/lib/survey-types";

/**
 * Public endpoint — deliberately unauthenticated. Agents fill the survey with
 * no account and no credentials; only reading the results (under `/admin`) is
 * gated.
 *
 * Where the response lands is the storage layer's business: Supabase when its
 * environment variables are set, a local file otherwise. See
 * `src/lib/responses/index.ts`.
 */

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

  try {
    await getResponseStore().save({
      surveyId: payload.surveyId ?? SURVEY.id,
      version: payload.version ?? SURVEY.version,
      language: (payload.language === "ms" ? "ms" : "en") as Lang,
      submittedAt: payload.submittedAt ?? new Date().toISOString(),
      receivedAt: new Date().toISOString(),
      answers,
    });
  } catch (error) {
    // Never swallow this: a thank-you screen over a failed write is how a
    // survey silently collects nothing.
    console.error("Failed to store survey response:", error);
    return NextResponse.json({ ok: false, error: "storage" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
