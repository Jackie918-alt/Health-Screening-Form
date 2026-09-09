/**
 * Aggregates across responses for the dashboard.
 *
 * All of it is computed in the app rather than in SQL, because the answers are
 * a JSONB bag and the schema is still moving. At survey scale — hundreds of
 * responses, not millions — reading them and reducing in memory is simpler than
 * maintaining SQL that has to know each question's shape. If this ever gets
 * slow, these become database views.
 *
 * Every figure counts only the responses that actually answered the question,
 * so a skipped optional question lowers the base rather than dragging an
 * average toward zero.
 */

import { t, type Lang } from "../i18n";
import { SURVEY } from "../survey-content";
import type { Question } from "../survey-types";
import type { SurveyResponse } from "./types";

export type Distribution = { label: string; count: number; share: number };

export type Summary = {
  total: number;
  byLanguage: Distribution[];
  /** Mean 1–5 satisfaction, or null when nobody has answered it. */
  satisfaction: { mean: number; base: number } | null;
  /** Promoters minus detractors, on the standard 0–10 scale. */
  nps: { score: number; promoters: number; passives: number; detractors: number; base: number } | null;
  topChallenges: Distribution[];
  /** Support areas ordered worst-rated first — where to look before anywhere else. */
  weakestAreas: { label: string; mean: number; base: number }[];
  lastReceivedAt: string | null;
};

function question(id: string): Question | undefined {
  return SURVEY.sections.flatMap((s) => s.questions).find((q) => q.id === id);
}

function distribution(counts: Map<string, number>, total: number): Distribution[] {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, share: total > 0 ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function summarise(responses: SurveyResponse[], lang: Lang = "en"): Summary {
  const total = responses.length;

  const languages = new Map<string, number>();
  for (const r of responses) {
    const label = r.language === "ms" ? "Bahasa Melayu" : "English";
    languages.set(label, (languages.get(label) ?? 0) + 1);
  }

  // ── Satisfaction ──────────────────────────────────────────────────────────
  const scores = responses
    .map((r) => r.answers.overall_satisfaction)
    .filter((v): v is number => typeof v === "number");
  const satisfaction = scores.length
    ? { mean: scores.reduce((a, b) => a + b, 0) / scores.length, base: scores.length }
    : null;

  // ── NPS ───────────────────────────────────────────────────────────────────
  const recommend = responses
    .map((r) => r.answers.recommend_likelihood)
    .filter((v): v is number => typeof v === "number");
  const promoters = recommend.filter((v) => v >= 9).length;
  const passives = recommend.filter((v) => v >= 7 && v <= 8).length;
  const detractors = recommend.filter((v) => v <= 6).length;
  const nps = recommend.length
    ? {
        score: Math.round(((promoters - detractors) / recommend.length) * 100),
        promoters,
        passives,
        detractors,
        base: recommend.length,
      }
    : null;

  // ── Challenges ────────────────────────────────────────────────────────────
  const challengeQuestion = question("challenges_faced");
  const challenges = new Map<string, number>();
  let challengeBase = 0;
  for (const r of responses) {
    const ticked = r.answers.challenges_faced;
    if (!Array.isArray(ticked) || ticked.length === 0) continue;
    challengeBase += 1;
    for (const value of ticked) {
      const option = challengeQuestion?.options?.find((o) => o.value === value);
      const label = option ? t(option.label, lang) : value;
      challenges.set(label, (challenges.get(label) ?? 0) + 1);
    }
  }

  // ── Support ratings ───────────────────────────────────────────────────────
  const ratingQuestion = question("support_ratings");
  const perRow = new Map<string, number[]>();
  for (const r of responses) {
    const grid = r.answers.support_ratings;
    if (!grid || typeof grid !== "object" || Array.isArray(grid)) continue;
    for (const [rowId, raw] of Object.entries(grid)) {
      const score = Number(raw);
      if (!Number.isFinite(score)) continue;
      perRow.set(rowId, [...(perRow.get(rowId) ?? []), score]);
    }
  }
  const weakestAreas = [...perRow.entries()]
    .map(([rowId, values]) => {
      const row = ratingQuestion?.rows?.find((r) => r.id === rowId);
      return {
        label: row ? t(row.label, lang) : rowId,
        mean: values.reduce((a, b) => a + b, 0) / values.length,
        base: values.length,
      };
    })
    .sort((a, b) => a.mean - b.mean);

  const lastReceivedAt = responses
    .map((r) => r.receivedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return {
    total,
    byLanguage: distribution(languages, total),
    satisfaction,
    nps,
    topChallenges: distribution(challenges, challengeBase).slice(0, 5),
    weakestAreas,
    lastReceivedAt,
  };
}
