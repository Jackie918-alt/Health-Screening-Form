"use client";

import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { draftStore, parseDraft, readDraft, writeDraft } from "@/lib/draft-store";
import { UI, interpolate } from "@/lib/i18n";
import { SURVEY } from "@/lib/survey-content";
import type { AnswerValue } from "@/lib/survey-types";
import {
  completionPercent,
  pruneHiddenAnswers,
  resolveQuestion,
  validateSection,
  visibleQuestions,
  visibleSections,
  type Errors,
} from "@/lib/survey-logic";
import { useLanguage } from "./LanguageProvider";
import { QuestionField } from "./QuestionField";

type Phase = "intro" | "form" | "done";
type Status = "idle" | "submitting" | "error";

export function SurveyForm() {
  const { lang, tr } = useLanguage();
  const [phase, setPhase] = useState<Phase>("intro");
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");
  const topRef = useRef<HTMLDivElement>(null);

  // ── Draft ────────────────────────────────────────────────────────────────
  // Answers live in a localStorage-backed store, so a refresh, a dropped
  // connection or a phone locking mid-survey never costs the agent their work.
  const rawDraft = useSyncExternalStore(
    draftStore.subscribe,
    draftStore.getSnapshot,
    draftStore.getServerSnapshot,
  );
  const { answers, step } = useMemo(() => parseDraft(rawDraft), [rawDraft]);
  const hasSavedAnswers = Object.keys(answers).length > 0;

  const setStep = useCallback((next: number) => {
    writeDraft({ ...readDraft(), step: next });
  }, []);

  // ── Derived state ────────────────────────────────────────────────────────
  const sections = useMemo(() => visibleSections(SURVEY, answers), [answers]);
  const safeStep = Math.min(step, sections.length - 1);
  const section = sections[safeStep];
  const questions = useMemo(
    () => (section ? visibleQuestions(section, answers, SURVEY) : []),
    [section, answers],
  );
  const percent = useMemo(() => completionPercent(SURVEY, answers), [answers]);
  const isLast = safeStep === sections.length - 1;

  const scrollToTop = useCallback(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const setAnswer = useCallback((id: string, value: AnswerValue) => {
    const current = readDraft();
    writeDraft({ ...current, answers: { ...current.answers, [id]: value } });
    // Clear the error as soon as the agent engages with the question; it is
    // re-checked when they try to move on.
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  function goNext() {
    if (!section) return;
    const found = validateSection(section, answers, lang, SURVEY);
    setErrors(found);

    if (Object.keys(found).length > 0) {
      const firstId = questions.find((q) => found[q.id])?.id;
      document
        .getElementById(`q-${firstId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (isLast) {
      void submit();
    } else {
      setStep(safeStep + 1);
      scrollToTop();
    }
  }

  function goBack() {
    setErrors({});
    setStep(Math.max(0, safeStep - 1));
    scrollToTop();
  }

  async function submit() {
    setStatus("submitting");
    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyId: SURVEY.id,
          version: SURVEY.version,
          language: lang,
          submittedAt: new Date().toISOString(),
          answers: pruneHiddenAnswers(SURVEY, answers),
        }),
      });
      if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
      draftStore.clear();
      setPhase("done");
      setStatus("idle");
      scrollToTop();
    } catch {
      setStatus("error");
    }
  }

  function startOver() {
    draftStore.clear();
    setErrors({});
    setPhase("intro");
    scrollToTop();
  }

  function resetAll() {
    if (!window.confirm(tr(UI.clearDraftConfirm))) return;
    startOver();
  }

  // ── Intro ────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div ref={topRef} className="mx-auto w-full max-w-2xl px-4 py-10 sm:py-16">
        <div className="rounded-3xl border border-line bg-white p-7 shadow-card sm:p-11">
          <p className="font-display text-[13px] font-bold uppercase tracking-[0.14em] text-brand-gradient">
            {tr(UI.brandTagline)}
          </p>
          <h1 className="mt-3 font-display text-[26px] font-extrabold leading-[1.35] tracking-tight text-ink sm:text-[32px]">
            {tr(UI.formTitle)}
          </h1>
          <p className="mt-5 text-[15px] leading-[1.75] text-ink-soft">
            {tr(UI.formIntro)}
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Chip icon="clock">{tr(UI.minutes)}</Chip>
            <Chip icon="list">
              {SURVEY.sections.length} {tr(UI.sections)}
            </Chip>
            <Chip icon="lock">{tr(UI.confidentialityNote)}</Chip>
          </div>

          {hasSavedAnswers && (
            <p className="mt-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-deep-700">
              {tr(UI.draftRestored)}
            </p>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setPhase("form");
                scrollToTop();
              }}
              className="focus-brand inline-flex items-center gap-2 rounded-full bg-brand-gradient px-7 py-3.5 font-display text-[15px] font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {tr(UI.start)}
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
              >
                <path d="M4 10h11m-4.5-5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {hasSavedAnswers && (
              <button
                type="button"
                onClick={resetAll}
                className="focus-brand rounded-full px-4 py-3 text-sm font-semibold text-ink-muted underline-offset-4 hover:text-deep-700 hover:underline"
              >
                {tr(UI.clearDraft)}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Thank you ────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <div ref={topRef} className="mx-auto w-full max-w-2xl px-4 py-14 sm:py-20">
        <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-card sm:p-12">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-gradient shadow-lift">
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="size-8 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.6}
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="mt-6 font-display text-[26px] font-extrabold tracking-tight text-ink">
            {tr(UI.thanksTitle)}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-[1.75] text-ink-soft">
            {tr(UI.thanksBody)}
          </p>
          <button
            type="button"
            onClick={startOver}
            className="focus-brand mt-8 rounded-full border border-line px-6 py-3 font-display text-sm font-bold text-deep-700 transition-colors hover:border-teal-400 hover:bg-teal-50"
          >
            {tr(UI.thanksAnother)}
          </button>
        </div>
      </div>
    );
  }

  if (!section) return null;
  const errorCount = Object.keys(errors).length;

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div ref={topRef} className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:pt-10">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <p className="font-display text-xs font-bold uppercase tracking-[0.12em] text-ink-muted">
            {interpolate(UI.stepOf, lang, {
              current: safeStep + 1,
              total: sections.length,
            })}
          </p>
          <p className="text-xs font-semibold text-teal-700">
            {interpolate(UI.percentComplete, lang, { percent })}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 overflow-hidden rounded-full bg-line"
        >
          <div
            className="h-full rounded-full bg-brand-gradient transition-[width] duration-500 ease-out"
            style={{ width: `${Math.max(percent, 2)}%` }}
          />
        </div>
      </div>

      {/* Section card */}
      <section className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-9">
        <header className="border-b border-line pb-6">
          {section.eyebrow && (
            <p className="mb-2 font-display text-xs font-bold uppercase tracking-[0.14em] text-brand-gradient">
              {tr(section.eyebrow)}
            </p>
          )}
          <h2 className="font-display text-[21px] font-extrabold uppercase leading-[1.3] text-ink sm:text-[24px]">
            {tr(section.title)}
          </h2>
          {section.description && (
            <p className="mt-3 text-[13px] leading-[1.75] text-ink-muted">{tr(section.description)}</p>
          )}
        </header>

        <div className="grid grid-cols-1 gap-8 pt-7 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-9">
          {questions.map((q) => (
            <div key={q.id} className={q.width === "half" ? "min-w-0" : "min-w-0 sm:col-span-2"}>
              <QuestionField
                question={resolveQuestion(q, answers, SURVEY)}
                value={answers[q.id]}
                otherText={
                  typeof answers[`${q.id}__other`] === "string"
                    ? (answers[`${q.id}__other`] as string)
                    : ""
                }
                error={errors[q.id]}
                onChange={(value) => setAnswer(q.id, value)}
                onOtherChange={(text) => setAnswer(`${q.id}__other`, text)}
              />
            </div>
          ))}
        </div>

        {errorCount > 0 && (
          <p
            role="alert"
            className="mt-7 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {interpolate(UI.errorSummary, lang, { count: errorCount })}
          </p>
        )}

        {status === "error" && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">{tr(UI.submitError)}</p>
            <button
              type="button"
              onClick={() => void submit()}
              className="focus-brand mt-1.5 font-semibold underline underline-offset-4"
            >
              {tr(UI.retry)}
            </button>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-9 flex items-center gap-3 border-t border-line pt-7">
          {safeStep > 0 && (
            <button
              type="button"
              onClick={goBack}
              className="focus-brand inline-flex items-center gap-1.5 rounded-full border border-line px-5 py-3 font-display text-sm font-bold text-ink-soft transition-colors hover:border-teal-400 hover:bg-teal-50"
            >
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
              >
                <path d="M16 10H5m4.5-5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {tr(UI.back)}
            </button>
          )}
          <button
            type="button"
            onClick={goNext}
            disabled={status === "submitting"}
            className="focus-brand ml-auto inline-flex items-center gap-2 rounded-full bg-brand-gradient px-7 py-3.5 font-display text-[15px] font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {status === "submitting" ? tr(UI.submitting) : isLast ? tr(UI.submit) : tr(UI.next)}
            {status !== "submitting" && (
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="size-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.4}
              >
                <path d="M4 10h11m-4.5-5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </section>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <svg
            aria-hidden
            viewBox="0 0 20 20"
            className="size-3.5 text-teal-600"
            fill="currentColor"
          >
            <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm3.7 6.2l-4.4 4.4a1 1 0 01-1.4 0L6 10.7a1 1 0 011.4-1.4l1.2 1.2 3.7-3.7a1 1 0 011.4 1.4z" />
          </svg>
          {tr(UI.draftSaved)}
        </p>
        <button
          type="button"
          onClick={resetAll}
          className="focus-brand rounded text-xs font-semibold text-ink-muted underline-offset-4 hover:text-deep-700 hover:underline"
        >
          {tr(UI.clearDraft)}
        </button>
      </div>
    </div>
  );
}

function Chip({ children, icon }: { children: React.ReactNode; icon: "clock" | "list" | "lock" }) {
  const paths = {
    clock:
      "M10 2a8 8 0 100 16 8 8 0 000-16zm1 4a1 1 0 10-2 0v4c0 .3.1.5.3.7l2.5 2.5a1 1 0 001.4-1.4L11 9.6V6z",
    list: "M4 5h12a1 1 0 010 2H4a1 1 0 010-2zm0 4h12a1 1 0 010 2H4a1 1 0 110-2zm0 4h8a1 1 0 010 2H4a1 1 0 010-2z",
    lock: "M6 8V6a4 4 0 118 0v2h.5A1.5 1.5 0 0116 9.5v6a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 014 15.5v-6A1.5 1.5 0 015.5 8H6zm2 0h4V6a2 2 0 10-4 0v2z",
  };
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-canvas px-3 py-1.5 text-xs font-medium text-ink-soft">
      <svg
        aria-hidden
        viewBox="0 0 20 20"
        className="size-3.5 shrink-0 text-teal-600"
        fill="currentColor"
      >
        <path d={paths[icon]} />
      </svg>
      {children}
    </span>
  );
}
