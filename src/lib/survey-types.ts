import type { Localized } from "./i18n";

/** A single answer. Grids store one value per row, keyed by row id. */
export type AnswerValue =
  | string
  | string[]
  | number
  | Record<string, string>
  | undefined;

export type Answers = Record<string, AnswerValue>;

export type Option = {
  value: string;
  label: Localized;
  /** Reveals a free-text box; the text is stored under `<questionId>__other`. */
  allowsText?: boolean;
  /** Pins the option to the bottom of the list and clears every other choice. */
  exclusive?: boolean;
};

export type GridRow = { id: string; label: Localized };

export type QuestionType =
  | "short-text"
  | "long-text"
  | "email"
  | "phone"
  | "nric"
  | "radio"
  | "checkbox"
  | "dropdown"
  | "scale"
  | "nps"
  | "rating-grid"
  | "consent";

/**
 * Conditional logic. Kept as plain data (never functions) so the whole survey
 * stays serialisable — a prerequisite for moving the schema into a CMS or
 * database later without touching the renderer.
 */
export type Condition =
  | { field: string; op: "equals" | "notEquals"; value: string }
  | { field: string; op: "includes" | "notIncludes"; value: string }
  | { field: string; op: "answered" | "notAnswered" }
  | { field: string; op: "lte" | "gte"; value: number }
  /** Number of boxes ticked on a checkbox question. */
  | { field: string; op: "countGte" | "countLte"; value: number }
  /** True when any row of a rating grid falls at or below / above a score. */
  | { field: string; op: "anyLte" | "anyGte"; value: number }
  | { all: Condition[] }
  | { any: Condition[] };

export type Question = {
  id: string;
  type: QuestionType;
  label: Localized;
  /** Smaller helper copy under the question. */
  help?: Localized;
  placeholder?: Localized;
  required?: boolean;
  options?: Option[];
  /**
   * Draws this question's options from another answer, so a follow-up only ever
   * offers back what the agent said. A checkbox source contributes the ticked
   * options; a `rating-grid` source contributes the rows tied at the lowest
   * score. Either way the question hides itself when fewer than two options
   * survive — there is nothing to choose between.
   */
  optionsFrom?: string;
  /**
   * With a `rating-grid` source, keeps only the rows scored at or below this —
   * so a follow-up can offer back exactly the areas the agent marked down.
   */
  optionsFromMaxScore?: number;
  rows?: GridRow[];
  /** `scale` only — inclusive bounds and the anchor captions at each end. */
  scale?: { min: number; max: number; minLabel: Localized; maxLabel: Localized };
  /** `checkbox` only. */
  maxSelections?: number;
  /** `long-text` / `short-text` only. */
  maxLength?: number;
  /**
   * Layout width on tablet and up. Two consecutive `"half"` questions share a
   * row; anything else spans the full width. Always full width on mobile.
   */
  width?: "full" | "half";
  /** Renders only when this evaluates true. Absent means always visible. */
  showIf?: Condition;
};

export type Section = {
  id: string;
  /** Optional kicker above the title, e.g. "Company support". */
  eyebrow?: Localized;
  title: Localized;
  description?: Localized;
  questions: Question[];
  showIf?: Condition;
};

export type Survey = {
  id: string;
  version: string;
  sections: Section[];
};
