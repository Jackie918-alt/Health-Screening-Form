/**
 * The shape of a stored survey response, and the contract every storage
 * backend implements.
 *
 * The survey renderer knows nothing about this file — a response is captured
 * as a plain `Answers` bag keyed by question id, so adding or reordering
 * questions never invalidates data already collected.
 */

import type { Lang } from "../i18n";
import type { Answers } from "../survey-types";

export type SurveyResponse = {
  id: string;
  surveyId: string;
  /** Schema version at the time of submission — old rows keep their own. */
  version: string;
  language: Lang;
  /** Clock of the device that submitted; can be wrong if the device is. */
  submittedAt: string;
  /** Server clock. Authoritative — this is what we sort and filter on. */
  receivedAt: string;
  answers: Answers;
};

export type NewResponse = Omit<SurveyResponse, "id">;

export type ListOptions = {
  limit: number;
  offset: number;
  /** Case-insensitive match across every free-text answer. */
  search?: string;
  language?: Lang;
};

export type ListResult = {
  rows: SurveyResponse[];
  /** Total matching rows, ignoring limit/offset — drives the pager. */
  total: number;
};

export interface ResponseStore {
  /** Which backend is actually serving — surfaced in the admin UI. */
  readonly driver: "supabase" | "file";
  /** Human-readable note about the driver's durability, shown to admins. */
  readonly note: string;
  save(record: NewResponse): Promise<SurveyResponse>;
  list(options: ListOptions): Promise<ListResult>;
  get(id: string): Promise<SurveyResponse | null>;
  /** Every row, oldest first — used only by the CSV export. */
  all(): Promise<SurveyResponse[]>;
}
