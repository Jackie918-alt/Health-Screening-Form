/**
 * Turns stored answers into something a human can read.
 *
 * Responses are stored as raw ids — `"selangor"`, `["prospecting","pricing"]`,
 * `{ training: "2" }` — because that is what survives a question being reworded
 * later. Everything here is the reverse trip, resolving those ids against the
 * current schema for display and export.
 *
 * Ids that no longer exist in the schema are shown as-is rather than dropped: a
 * response to a since-deleted option is still data someone gave us.
 */

import { t, type Lang } from "../i18n";
import { SURVEY } from "../survey-content";
import type { AnswerValue, Question } from "../survey-types";

export type PresentedAnswer = {
  questionId: string;
  label: string;
  value: string;
  /** True when the agent typed this rather than picking it. */
  freeText: boolean;
};

/** Every question in schema order, flattened out of its section. */
export function allQuestions(): Question[] {
  return SURVEY.sections.flatMap((section) => section.questions);
}

function optionLabel(question: Question, value: string, lang: Lang): string {
  const option = question.options?.find((o) => o.value === value);
  return option ? t(option.label, lang) : value;
}

/** One answer rendered as text. Grids become "Row: score" lines. */
export function renderAnswer(question: Question, value: AnswerValue, lang: Lang): string {
  if (value === undefined || value === "") return "";

  if (Array.isArray(value)) {
    return value.map((v) => optionLabel(question, v, lang)).join("; ");
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([rowId, score]) => {
        const row = question.rows?.find((r) => r.id === rowId);
        return `${row ? t(row.label, lang) : rowId}: ${score}`;
      })
      .join("\n");
  }

  if (typeof value === "number") return String(value);

  switch (question.type) {
    case "radio":
    case "dropdown":
      return optionLabel(question, value, lang);
    case "consent":
      return value === "agreed" ? "Agreed" : value;
    default:
      return value;
  }
}

/**
 * Every answered question in schema order, plus any `__other` free text the
 * agent typed alongside an option.
 */
export function presentAnswers(answers: Record<string, AnswerValue>, lang: Lang): PresentedAnswer[] {
  const out: PresentedAnswer[] = [];

  for (const question of allQuestions()) {
    const value = answers[question.id];
    const rendered = renderAnswer(question, value, lang);
    if (rendered) {
      out.push({
        questionId: question.id,
        label: t(question.label, lang),
        value: rendered,
        freeText: question.type === "long-text" || question.type === "short-text",
      });
    }

    const other = answers[`${question.id}__other`];
    if (typeof other === "string" && other.trim()) {
      out.push({
        questionId: `${question.id}__other`,
        label: `${t(question.label, lang)} — specified`,
        value: other,
        freeText: true,
      });
    }
  }

  return out;
}

/**
 * A short preview line for the list view: the first long-form comment.
 *
 * Long-text only, deliberately. Short-text questions include the agent's name
 * and NRIC, and the list view is the one screen an admin leaves open — personal
 * details belong on the detail page, behind a click, not in a scannable table.
 */
export function firstComment(answers: Record<string, AnswerValue>): string {
  for (const question of allQuestions()) {
    if (question.type !== "long-text") continue;
    const value = answers[question.id];
    if (typeof value === "string" && value.trim()) return value;
  }
  return "";
}
