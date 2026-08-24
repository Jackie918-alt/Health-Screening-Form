"use client";

import { UI, interpolate, type Lang } from "@/lib/i18n";
import type { AnswerValue, Option, Question } from "@/lib/survey-types";
import { useLanguage } from "./LanguageProvider";

type Props = {
  question: Question;
  value: AnswerValue;
  otherText: string;
  error?: string;
  onChange: (value: AnswerValue) => void;
  onOtherChange: (text: string) => void;
};

/** How close to `maxLength` a single-line answer gets before the count appears. */
const COUNTER_THRESHOLD = 30;

/** Keyboard and autofill behaviour per text-like question type. */
const TEXT_INPUTS: Record<
  "short-text" | "email" | "phone" | "nric",
  { type: string; inputMode?: React.ComponentProps<"input">["inputMode"]; autoComplete: string }
> = {
  "short-text": { type: "text", autoComplete: "off" },
  email: { type: "email", inputMode: "email", autoComplete: "email" },
  phone: { type: "tel", inputMode: "tel", autoComplete: "tel" },
  // Numeric keypad on phones; never autofilled, since it is not a stored credential.
  nric: { type: "text", inputMode: "numeric", autoComplete: "off" },
};

const inputBase =
  "focus-brand w-full rounded-xl border border-line bg-white px-4 py-3 text-base text-ink sm:text-[15px] " +
  "placeholder:text-ink-muted/60 transition-colors hover:border-teal-300 focus:border-teal-500";

/** Option cards used by radio, checkbox and consent. */
function choiceClasses(selected: boolean): string {
  return [
    "focus-brand group flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-left transition-all sm:p-4",
    selected
      ? "border-teal-500 bg-teal-50 shadow-[0_0_0_1px_var(--color-teal-500)]"
      : "border-line bg-white hover:border-teal-300 hover:bg-teal-50/40",
  ].join(" ");
}

function Marker({ selected, shape }: { selected: boolean; shape: "circle" | "square" }) {
  return (
    <span
      aria-hidden
      className={[
        "mt-0.5 flex size-5 shrink-0 items-center justify-center border-2 transition-colors",
        shape === "circle" ? "rounded-full" : "rounded-md",
        selected ? "border-teal-600 bg-teal-600" : "border-line bg-white group-hover:border-teal-400",
      ].join(" ")}
    >
      {shape === "circle" ? (
        selected && <span className="size-2 rounded-full bg-white" />
      ) : (
        selected && (
          <svg viewBox="0 0 20 20" className="size-3.5 text-white" fill="none" strokeWidth={3.2} stroke="currentColor">
            <path d="M4 10.5l4 4 8-8.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )
      )}
    </span>
  );
}

/** Numbered pill row shared by `scale` (1–5) and `nps` (0–10). */
function NumberScale({
  min,
  max,
  value,
  onSelect,
  minLabel,
  maxLabel,
  name,
}: {
  min: number;
  max: number;
  value: number | undefined;
  onSelect: (n: number) => void;
  minLabel: string;
  maxLabel: string;
  name: string;
}) {
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const wide = steps.length > 6;

  return (
    <div className="space-y-2.5">
      <div
        role="radiogroup"
        aria-label={name}
        className={["grid gap-1.5 sm:gap-2", wide ? "grid-cols-6 sm:grid-cols-11" : "grid-cols-5"].join(" ")}
      >
        {steps.map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(n)}
              className={[
                "focus-brand flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition-all sm:h-12",
                selected
                  ? "border-transparent bg-brand-gradient text-white shadow-md"
                  : "border-line bg-white text-ink-soft hover:border-teal-400 hover:bg-teal-50",
              ].join(" ")}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between gap-4 text-xs text-ink-muted">
        <span>{minLabel}</span>
        <span className="text-right">{maxLabel}</span>
      </div>
    </div>
  );
}

function OtherInput({
  visible,
  value,
  onChange,
  lang,
  id,
}: {
  visible: boolean;
  value: string;
  onChange: (v: string) => void;
  lang: Lang;
  id: string;
}) {
  if (!visible) return null;
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={UI.otherPlaceholder[lang]}
      aria-label={UI.otherPlaceholder[lang]}
      className={`${inputBase} mt-2.5`}
    />
  );
}

export function QuestionField({ question, value, otherText, error, onChange, onOtherChange }: Props) {
  const { lang, tr } = useLanguage();
  const describedBy = [question.help ? `${question.id}-help` : null, error ? `${question.id}-error` : null]
    .filter(Boolean)
    .join(" ");

  const selectedValues: string[] = Array.isArray(value) ? value : [];
  const hasOther = (opt: Option) =>
    opt.allowsText &&
    (Array.isArray(value) ? value.includes(opt.value) : String(value ?? "") === opt.value);
  const anyOtherPicked = question.options?.some(hasOther) ?? false;

  function toggleCheckbox(opt: Option) {
    const exists = selectedValues.includes(opt.value);
    if (opt.exclusive) {
      onChange(exists ? [] : [opt.value]);
      return;
    }
    const cleared = selectedValues.filter(
      (v) => !question.options?.find((o) => o.value === v)?.exclusive,
    );
    const next = exists ? cleared.filter((v) => v !== opt.value) : [...cleared, opt.value];
    onChange(next);
  }

  function renderControl() {
    switch (question.type) {
      case "short-text":
      case "email":
      case "phone":
      case "nric": {
        const text = typeof value === "string" ? value : "";
        // A capped single-line field stops accepting keystrokes silently, so
        // surface the remaining count once the agent is close to the cap.
        const remaining = question.maxLength ? question.maxLength - text.length : null;
        const showCount =
          question.type === "short-text" && remaining !== null && remaining <= COUNTER_THRESHOLD;
        return (
          <div>
            <input
              id={question.id}
              {...TEXT_INPUTS[question.type]}
              value={text}
              maxLength={question.maxLength}
              placeholder={question.placeholder ? tr(question.placeholder) : undefined}
              aria-describedby={describedBy || undefined}
              aria-invalid={Boolean(error)}
              onChange={(e) => onChange(e.target.value)}
              className={inputBase}
            />
            {showCount && (
              <p className="mt-1.5 text-right text-xs text-ink-muted">
                {interpolate(UI.charactersLeft, lang, { count: remaining })}
              </p>
            )}
          </div>
        );
      }

      case "long-text": {
        const text = typeof value === "string" ? value : "";
        return (
          <div>
            <textarea
              id={question.id}
              rows={4}
              value={text}
              maxLength={question.maxLength}
              placeholder={question.placeholder ? tr(question.placeholder) : undefined}
              aria-describedby={describedBy || undefined}
              aria-invalid={Boolean(error)}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} resize-y leading-[1.75]`}
            />
            {question.maxLength && (
              <p className="mt-1.5 text-right text-xs text-ink-muted">
                {interpolate(UI.charactersLeft, lang, { count: question.maxLength - text.length })}
              </p>
            )}
          </div>
        );
      }

      case "dropdown":
        return (
          <div className="relative">
            <select
              id={question.id}
              value={typeof value === "string" ? value : ""}
              aria-describedby={describedBy || undefined}
              aria-invalid={Boolean(error)}
              onChange={(e) => onChange(e.target.value)}
              className={`${inputBase} appearance-none pr-11 ${value ? "" : "text-ink-muted/70"}`}
            >
              <option value="">{UI.selectPlaceholder[lang]}</option>
              {question.options?.map((opt) => (
                <option key={opt.value} value={opt.value} className="text-ink">
                  {tr(opt.label)}
                </option>
              ))}
            </select>
            <svg
              aria-hidden
              viewBox="0 0 20 20"
              className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M5 7.5l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2.5">
            {question.options?.map((opt) => {
              const selected = String(value ?? "") === opt.value;
              return (
                <div key={opt.value}>
                  <label className={choiceClasses(selected)}>
                    <input
                      type="radio"
                      name={question.id}
                      value={opt.value}
                      checked={selected}
                      onChange={() => onChange(opt.value)}
                      aria-describedby={describedBy || undefined}
                      className="sr-only"
                    />
                    <Marker selected={selected} shape="circle" />
                    <span className="text-sm leading-[1.55] text-ink">{tr(opt.label)}</span>
                  </label>
                  <OtherInput
                    visible={hasOther(opt) === true}
                    value={otherText}
                    onChange={onOtherChange}
                    lang={lang}
                    id={`${question.id}__other`}
                  />
                </div>
              );
            })}
          </div>
        );

      case "checkbox": {
        const atLimit =
          question.maxSelections !== undefined && selectedValues.length >= question.maxSelections;
        return (
          <div className="space-y-2.5">
            {question.options?.map((opt) => {
              const selected = selectedValues.includes(opt.value);
              const blocked = atLimit && !selected;
              return (
                <div key={opt.value}>
                  <label
                    className={[
                      choiceClasses(selected),
                      blocked ? "cursor-not-allowed opacity-45 hover:border-line hover:bg-white" : "",
                    ].join(" ")}
                  >
                    <input
                      type="checkbox"
                      name={question.id}
                      value={opt.value}
                      checked={selected}
                      disabled={blocked}
                      onChange={() => toggleCheckbox(opt)}
                      aria-describedby={describedBy || undefined}
                      className="sr-only"
                    />
                    <Marker selected={selected} shape="square" />
                    <span className="text-sm leading-[1.55] text-ink">{tr(opt.label)}</span>
                  </label>
                  <OtherInput
                    visible={hasOther(opt) === true}
                    value={otherText}
                    onChange={onOtherChange}
                    lang={lang}
                    id={`${question.id}__other`}
                  />
                </div>
              );
            })}
            {question.maxSelections && (
              <p className="pt-0.5 text-xs font-medium text-ink-muted">
                {interpolate(UI.selectedCount, lang, { count: selectedValues.length })} ·{" "}
                {interpolate(UI.chooseUpTo, lang, { max: question.maxSelections })}
              </p>
            )}
          </div>
        );
      }

      case "scale":
      case "nps": {
        const bounds =
          question.type === "nps"
            ? { min: 0, max: 10, minLabel: UI.npsLow[lang], maxLabel: UI.npsHigh[lang] }
            : {
                min: question.scale?.min ?? 1,
                max: question.scale?.max ?? 5,
                minLabel: question.scale ? tr(question.scale.minLabel) : UI.scaleLow[lang],
                maxLabel: question.scale ? tr(question.scale.maxLabel) : UI.scaleHigh[lang],
              };
        return (
          <NumberScale
            {...bounds}
            name={tr(question.label)}
            value={typeof value === "number" ? value : undefined}
            onSelect={(n) => onChange(n)}
          />
        );
      }

      case "rating-grid": {
        const grid = (value && typeof value === "object" && !Array.isArray(value)
          ? value
          : {}) as Record<string, string>;
        const min = question.scale?.min ?? 1;
        const max = question.scale?.max ?? 5;
        const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i);

        return (
          <div className="space-y-2">
            {/* Anchors sit above the rows: on a phone the grid is long, and a
                caption underneath would only be read after the rating is done. */}
            <div className="flex justify-between px-1 pb-1 text-xs text-ink-muted">
              <span>
                {min} — {question.scale ? tr(question.scale.minLabel) : UI.ratingLow[lang]}
              </span>
              <span>
                {max} — {question.scale ? tr(question.scale.maxLabel) : UI.ratingHigh[lang]}
              </span>
            </div>

            {question.rows?.map((row) => {
              const current = grid[row.id];
              return (
                <div
                  key={row.id}
                  role="radiogroup"
                  aria-label={tr(row.label)}
                  className="rounded-xl border border-line bg-white p-3.5 transition-colors hover:border-teal-300 sm:flex sm:items-center sm:gap-4 sm:py-2.5"
                >
                  <span className="block text-sm leading-[1.55] text-ink sm:flex-1">
                    {tr(row.label)}
                  </span>
                  <div className="mt-2.5 grid grid-cols-5 gap-1.5 sm:mt-0 sm:flex">
                    {steps.map((n) => {
                      const selected = current === String(n);
                      return (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          aria-label={`${tr(row.label)}: ${n}`}
                          onClick={() => onChange({ ...grid, [row.id]: String(n) })}
                          className={[
                            "focus-brand h-10 rounded-lg border text-sm font-semibold transition-all sm:w-11",
                            selected
                              ? "border-transparent bg-brand-gradient text-white shadow-sm"
                              : "border-line bg-white text-ink-soft hover:border-teal-400 hover:bg-teal-50",
                          ].join(" ")}
                        >
                          {n}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

          </div>
        );
      }

      case "consent":
        return (
          <div className="space-y-2.5">
            {question.options?.map((opt) => {
              const selected = selectedValues.includes(opt.value);
              return (
                <label key={opt.value} className={choiceClasses(selected)}>
                  <input
                    type="checkbox"
                    name={question.id}
                    checked={selected}
                    onChange={() => onChange(selected ? [] : [opt.value])}
                    aria-describedby={describedBy || undefined}
                    className="sr-only"
                  />
                  <Marker selected={selected} shape="square" />
                  <span className="text-[13px] leading-[1.75] text-ink-soft">{tr(opt.label)}</span>
                </label>
              );
            })}
          </div>
        );
    }
  }

  // The consent question carries its legal text inside the option itself.
  const showLabel = question.type !== "consent";

  return (
    <div className="flex h-full scroll-mt-28 flex-col" id={`q-${question.id}`}>
      {showLabel && (
        <div className="mb-3 flex-1">
          <label
            htmlFor={["short-text", "long-text", "email", "phone", "nric", "dropdown"].includes(question.type)
              ? question.id
              : undefined}
            className="block font-display text-[16px] font-semibold leading-[1.5] text-ink"
          >
            {tr(question.label)}
            {question.required ? (
              <span aria-hidden className="ml-1 text-teal-600">
                *
              </span>
            ) : (
              <span className="ml-2 align-middle text-xs font-medium text-ink-muted">
                ({UI.optional[lang]})
              </span>
            )}
          </label>
          {question.help && (
            <p id={`${question.id}-help`} className="mt-1.5 text-[13px] leading-[1.75] text-ink-muted">
              {tr(question.help)}
            </p>
          )}
        </div>
      )}

      {renderControl()}

      {anyOtherPicked && question.type === "dropdown" && (
        <OtherInput
          visible
          value={otherText}
          onChange={onOtherChange}
          lang={lang}
          id={`${question.id}__other`}
        />
      )}

      {error && (
        <p
          id={`${question.id}-error`}
          role="alert"
          className="mt-2.5 flex items-start gap-1.5 text-[13px] font-medium text-red-600"
        >
          <svg aria-hidden viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0" fill="currentColor">
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 4a1 1 0 011 1v4a1 1 0 11-2 0V7a1 1 0 011-1zm0 8.5a1.15 1.15 0 110-2.3 1.15 1.15 0 010 2.3z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
