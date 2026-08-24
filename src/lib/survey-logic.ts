import type {
  Answers,
  AnswerValue,
  Condition,
  Option,
  Question,
  Section,
  Survey,
} from "./survey-types";
import { UI, interpolate, type Lang } from "./i18n";

/** True when the agent has actually put something in the field. */
export function isAnswered(value: AnswerValue): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.length > 0;
  return Object.values(value).some((v) => String(v).trim().length > 0);
}

export function evaluate(condition: Condition, answers: Answers): boolean {
  if ("all" in condition) return condition.all.every((c) => evaluate(c, answers));
  if ("any" in condition) return condition.any.some((c) => evaluate(c, answers));

  const value = answers[condition.field];

  switch (condition.op) {
    case "answered":
      return isAnswered(value);
    case "notAnswered":
      return !isAnswered(value);
    case "equals":
      return String(value ?? "") === condition.value;
    case "notEquals":
      return String(value ?? "") !== condition.value;
    case "includes":
      return Array.isArray(value) && value.includes(condition.value);
    case "notIncludes":
      return !Array.isArray(value) || !value.includes(condition.value);
    case "lte":
      return typeof value === "number" && value <= condition.value;
    case "gte":
      return typeof value === "number" && value >= condition.value;
    case "countGte":
      return Array.isArray(value) && value.length >= condition.value;
    case "countLte":
      return Array.isArray(value) && value.length <= condition.value;
    case "anyLte":
    case "anyGte": {
      if (!value || typeof value !== "object" || Array.isArray(value)) return false;
      return Object.values(value).some((raw) => {
        const score = Number(raw);
        if (Number.isNaN(score)) return false;
        return condition.op === "anyLte" ? score <= condition.value : score >= condition.value;
      });
    }
  }
}

export function isVisible(item: { showIf?: Condition }, answers: Answers): boolean {
  return item.showIf ? evaluate(item.showIf, answers) : true;
}

/**
 * The options a question actually offers right now. With `optionsFrom`, that is
 * the subset of the source question's options the agent ticked — so a follow-up
 * can never offer a choice they did not make.
 */
export function resolveOptions(
  question: Question,
  answers: Answers,
  survey: Survey,
): Option[] | undefined {
  if (!question.optionsFrom) return question.options;

  const answer = answers[question.optionsFrom];
  const source = survey.sections
    .flatMap((section) => section.questions)
    .find((q) => q.id === question.optionsFrom);

  // A rating grid contributes only the rows tied at its lowest score. When a
  // single row is clearly the worst there is nothing to ask, and the
  // fewer-than-two rule below hides the question.
  if (source?.type === "rating-grid") {
    const scores = (answer && typeof answer === "object" && !Array.isArray(answer)
      ? answer
      : {}) as Record<string, string>;
    const scored = (source.rows ?? []).filter((row) => !Number.isNaN(Number(scores[row.id])));
    if (scored.length === 0) return [];

    const lowest = Math.min(...scored.map((row) => Number(scores[row.id])));
    const cap = question.optionsFromMaxScore;
    if (cap !== undefined && lowest > cap) return [];

    return scored
      .filter((row) => Number(scores[row.id]) === lowest)
      .map((row) => ({ value: row.id, label: row.label }));
  }

  const picked = answer;
  if (!Array.isArray(picked)) return [];

  return (source?.options ?? [])
    .filter((option) => picked.includes(option.value))
    // The source question already captured any "please specify" text, so the
    // follow-up must not ask for it a second time.
    .map((option) => ({ ...option, allowsText: false }));
}

/** The question as it should render for the current answers. */
export function resolveQuestion(question: Question, answers: Answers, survey: Survey): Question {
  if (!question.optionsFrom) return question;
  return { ...question, options: resolveOptions(question, answers, survey) };
}

/**
 * A question is visible when its `showIf` passes and — for questions whose
 * options are derived from another answer — there are at least two options to
 * choose between. Offering a single choice is not a question.
 */
export function isQuestionVisible(question: Question, answers: Answers, survey: Survey): boolean {
  if (!isVisible(question, answers)) return false;
  if (!question.optionsFrom) return true;
  return (resolveOptions(question, answers, survey)?.length ?? 0) >= 2;
}

export function visibleQuestions(section: Section, answers: Answers, survey: Survey): Question[] {
  return section.questions.filter((q) => isQuestionVisible(q, answers, survey));
}

export function visibleSections(survey: Survey, answers: Answers): Section[] {
  return survey.sections.filter((s) => isVisible(s, answers));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Malaysian mobile/landline, tolerant of spaces, dashes and +60. */
const PHONE_RE = /^(\+?60|0)[\s-]?\d{1,2}[\s-]?\d{3,4}[\s-]?\d{4}$/;

/** Digits only, so `030405-10-1234` and `030405101234` both pass. */
function isValidNric(value: string): boolean {
  return /^\d{12}$/.test(value.replace(/[\s-]/g, ""));
}

export type Errors = Record<string, string>;

/** Validates one question against the current answers; returns a localised message or null. */
export function validateQuestion(
  q: Question,
  answers: Answers,
  lang: Lang,
  survey: Survey,
): string | null {
  const value = answers[q.id];
  const answered = isAnswered(value);

  if (q.required && !answered) {
    return q.type === "checkbox" || q.type === "consent"
      ? UI.errorSelectOne[lang]
      : UI.errorRequired[lang];
  }
  if (!answered) return null;

  if (q.type === "email" && !EMAIL_RE.test(String(value).trim())) {
    return UI.errorEmail[lang];
  }
  if (q.type === "phone" && !PHONE_RE.test(String(value).trim())) {
    return UI.errorPhone[lang];
  }
  if (q.type === "nric" && !isValidNric(String(value))) {
    return UI.errorNric[lang];
  }
  if (q.type === "checkbox" && q.maxSelections && Array.isArray(value)) {
    if (value.length > q.maxSelections) {
      return interpolate(UI.errorMaxSelect, lang, { max: q.maxSelections });
    }
  }
  if (q.type === "rating-grid" && q.required && q.rows) {
    const grid = (value ?? {}) as Record<string, string>;
    const missing = q.rows.some((row) => !isAnswered(grid[row.id]));
    if (missing) return UI.errorRequired[lang];
  }

  // Guards the case where an agent answers a follow-up, then goes back and
  // changes the selection it was derived from.
  const options = resolveOptions(q, answers, survey);
  if (options && options.length > 0) {
    const allowed = new Set(options.map((o) => o.value));
    const chosen = Array.isArray(value) ? value : [String(value)];
    if (chosen.some((v) => !allowed.has(v))) return UI.errorStaleOption[lang];
  }

  // An "other" choice that is picked but left blank is an incomplete answer.
  const otherPicked = options?.some(
    (o) =>
      o.allowsText &&
      (Array.isArray(value) ? value.includes(o.value) : String(value) === o.value),
  );
  if (otherPicked && !isAnswered(answers[`${q.id}__other`])) {
    return UI.errorSpecify[lang];
  }

  return null;
}

export function validateSection(
  section: Section,
  answers: Answers,
  lang: Lang,
  survey: Survey,
): Errors {
  const errors: Errors = {};
  for (const q of visibleQuestions(section, answers, survey)) {
    const message = validateQuestion(q, answers, lang, survey);
    if (message) errors[q.id] = message;
  }
  return errors;
}

/**
 * Percentage of currently-visible required questions that are answered.
 * Visibility is recomputed as answers change, so the bar reflects the real
 * remaining path rather than a fixed question count.
 */
export function completionPercent(survey: Survey, answers: Answers): number {
  const required = visibleSections(survey, answers)
    .flatMap((s) => visibleQuestions(s, answers, survey))
    .filter((q) => q.required);

  if (required.length === 0) return 0;
  const done = required.filter((q) => !validateQuestion(q, answers, "en", survey)).length;
  return Math.round((done / required.length) * 100);
}

/**
 * Drops answers whose question is no longer visible, so a submission never
 * carries orphaned values from a branch the agent backed out of.
 */
export function pruneHiddenAnswers(survey: Survey, answers: Answers): Answers {
  const liveIds = new Set(
    visibleSections(survey, answers)
      .flatMap((s) => visibleQuestions(s, answers, survey))
      .flatMap((q) => [q.id, `${q.id}__other`]),
  );
  return Object.fromEntries(
    Object.entries(answers).filter(([key]) => liveIds.has(key)),
  );
}
