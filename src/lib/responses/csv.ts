/**
 * CSV export — one row per response, one column per question.
 *
 * Columns come from the current schema in question order, so the file opens in
 * Excel with stable, comparable columns even though responses are stored as a
 * sparse bag. A question added later simply appears as a new empty column for
 * older rows.
 */

import { t, type Lang } from "../i18n";
import { allQuestions, renderAnswer } from "./present";
import type { SurveyResponse } from "./types";

/** RFC 4180: quote everything, double any embedded quote. */
function cell(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

export function toCsv(responses: SurveyResponse[], lang: Lang = "en"): string {
  const questions = allQuestions();

  const header = [
    "Response ID",
    "Submitted at",
    "Received at",
    "Language",
    "Survey version",
    ...questions.flatMap((q) => {
      const label = t(q.label, lang);
      // A question that allows free text gets a second column for it, rather
      // than mixing "Other" and the typed text into one cell.
      return q.options?.some((o) => o.allowsText) ? [label, `${label} (specified)`] : [label];
    }),
  ];

  const rows = responses.map((response) => [
    response.id,
    response.submittedAt,
    response.receivedAt,
    response.language,
    response.version,
    ...questions.flatMap((q) => {
      const value = renderAnswer(q, response.answers[q.id], lang);
      if (!q.options?.some((o) => o.allowsText)) return [value];
      const other = response.answers[`${q.id}__other`];
      return [value, typeof other === "string" ? other : ""];
    }),
  ]);

  // Excel on Windows needs the BOM to read UTF-8 — without it Malay text with
  // accents arrives mangled.
  return `﻿${[header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n")}\r\n`;
}
