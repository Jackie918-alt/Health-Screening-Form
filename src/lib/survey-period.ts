/**
 * The window in which agents are invited to answer.
 *
 * Kept as plain year/month/day numbers rather than `Date`, so the dates an
 * admin edits here are exactly the dates every agent sees — no timezone shift
 * between the server rendering and a phone in another region.
 */

import { DEFAULT_LANG, type Lang, type Localized } from "./i18n";

export type PlainDate = { year: number; month: number; day: number };

/** Edit these two lines to move the survey window. `month` is 1–12. */
export const SURVEY_PERIOD: { opens: PlainDate; closes: PlainDate } = {
  opens: { year: 2026, month: 9, day: 16 },
  closes: { year: 2026, month: 10, day: 15 },
};

/** Month names, indexed 1–12 (index 0 is unused padding). */
const MONTHS: Record<Lang, readonly string[]> = {
  en: [
    "",
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ],
  ms: [
    "",
    "Januari",
    "Februari",
    "Mac",
    "April",
    "Mei",
    "Jun",
    "Julai",
    "Ogos",
    "September",
    "Oktober",
    "November",
    "Disember",
  ],
};

function formatDate(date: PlainDate, lang: Lang): string {
  const months = MONTHS[lang] ?? MONTHS[DEFAULT_LANG];
  return `${date.day} ${months[date.month]} ${date.year}`;
}

/** "16 September 2026 – 15 October 2026". */
export function formatSurveyPeriod(lang: Lang): string {
  const { opens, closes } = SURVEY_PERIOD;
  return `${formatDate(opens, lang)} – ${formatDate(closes, lang)}`;
}

/** Chip copy for the intro card, labelled so the dates read as a deadline. */
export function surveyPeriodLabel(): Localized {
  return {
    en: `Response period: ${formatSurveyPeriod("en")}`,
    ms: `Tempoh maklum balas: ${formatSurveyPeriod("ms")}`,
  };
}
