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

/**
 * Where "today" falls relative to the response window.
 *
 * The window is inclusive at both ends and evaluated in Malaysia time, because
 * that is the calendar the dates were chosen against. Comparing UTC instants
 * would close the survey at 8am on the 16th for an agent in Kuala Lumpur.
 */
export type PeriodPhase = "before" | "open" | "after";

/** Today's date in Asia/Kuala_Lumpur, as plain numbers. */
function todayInMalaysia(now: Date): PlainDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Comparable YYYYMMDD integer — avoids any Date parsing or timezone maths. */
function ordinal(date: PlainDate): number {
  return date.year * 10000 + date.month * 100 + date.day;
}

export function periodPhase(now: Date = new Date()): PeriodPhase {
  const today = ordinal(todayInMalaysia(now));
  if (today < ordinal(SURVEY_PERIOD.opens)) return "before";
  if (today > ordinal(SURVEY_PERIOD.closes)) return "after";
  return "open";
}

/** True on any day within the window, ends included. */
export function isSurveyOpen(now: Date = new Date()): boolean {
  return periodPhase(now) === "open";
}
