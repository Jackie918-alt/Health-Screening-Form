/**
 * The one definition of "matches this filter".
 *
 * Shared by the CSV export and the dashboard summary so that what an admin
 * sees on screen, and what they download, are always the same set of
 * responses.
 */

import type { Lang } from "../i18n";
import type { SurveyResponse } from "./types";

export type Filter = { search?: string; language?: Lang };

export function filterResponses(rows: SurveyResponse[], { search, language }: Filter): SurveyResponse[] {
  const needle = search?.trim().toLowerCase();
  return rows.filter((row) => {
    if (language && row.language !== language) return false;
    if (!needle) return true;
    return JSON.stringify(row.answers).toLowerCase().includes(needle);
  });
}
