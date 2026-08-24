import { createPersistedStore } from "./persisted-store";
import type { Answers } from "./survey-types";

export type Draft = { answers: Answers; step: number };

const EMPTY: Draft = { answers: {}, step: 0 };

export const draftStore = createPersistedStore("wekongsi.survey.draft");

export function parseDraft(raw: string | null): Draft {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as Partial<Draft>;
    return {
      answers: parsed.answers ?? {},
      step: typeof parsed.step === "number" ? parsed.step : 0,
    };
  } catch {
    return EMPTY; // A corrupted draft must never block the survey.
  }
}

/** Current draft straight from the store cache — safe from stale closures. */
export function readDraft(): Draft {
  return parseDraft(draftStore.getSnapshot());
}

export function writeDraft(draft: Draft): void {
  draftStore.set(JSON.stringify(draft));
}
