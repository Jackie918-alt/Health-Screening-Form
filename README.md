# We Kongsi — Agent Voice Survey

A bilingual (English–Malaysia / Bahasa Melayu) survey that collects agent feedback on
the challenges they face and where the company should improve.

Built with Next.js 16 (App Router), React 19 and Tailwind v4. Brand colours are sampled
directly from the We Kongsi badge logo.

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint     # eslint
```

## Status: first draft

The questions below are a proposed starting point, not final copy. The linked Microsoft
Form could not be read (it requires a Microsoft sign-in), so the content was drafted from
scratch around the brief: challenges faced, and areas for the company to improve.

**Expect to revise:** question wording, the option lists, and the conditional branching
rules. The code is structured so all three are data edits, not component changes.

## How it is put together

| File | What lives there |
| --- | --- |
| [src/lib/survey-content.ts](src/lib/survey-content.ts) | **All questions, options and translations.** Edit this to change the survey. |
| [src/lib/survey-types.ts](src/lib/survey-types.ts) | Question / section / condition types |
| [src/lib/survey-logic.ts](src/lib/survey-logic.ts) | Conditional evaluation, validation, progress |
| [src/lib/i18n.ts](src/lib/i18n.ts) | Language plumbing and all non-question UI copy |
| [src/components/QuestionField.tsx](src/components/QuestionField.tsx) | Renders every question type |
| [src/components/SurveyForm.tsx](src/components/SurveyForm.tsx) | Steps, validation, draft saving, submit |
| [src/app/api/submit/route.ts](src/app/api/submit/route.ts) | Receives responses |
| [src/app/globals.css](src/app/globals.css) | Brand tokens (`--color-teal-500`, `bg-brand-gradient`, …) |

### Bilingual copy

Every piece of author-supplied text is a pair written with `L(english, malay)`:

```ts
label: L("How long have you been with We Kongsi?", "Berapa lamakah anda bersama We Kongsi?"),
```

Both languages are required by the type system, so a missing translation is a build
error rather than an English string leaking into the Malay form. The language toggle sits
in the header; the choice is remembered per device and also sets `<html lang>`.

### Adding or editing a question

Add an entry to the relevant section's `questions` array:

```ts
{
  id: "commission_clarity",              // becomes the response column name
  type: "scale",                         // see the list below
  label: L("I understand how my commission is calculated.",
           "Saya faham bagaimana komisen saya dikira."),
  help: L("Optional helper text", "Teks bantuan pilihan"),
  required: true,
  scale: { min: 1, max: 5, minLabel: L("Strongly disagree", "Sangat tidak setuju"),
                           maxLabel: L("Strongly agree", "Sangat setuju") },
}
```

Available `type` values: `short-text`, `long-text`, `email`, `phone`, `radio`, `checkbox`,
`dropdown`, `scale`, `nps`, `rating-grid`, `consent`.

Useful extras: `maxSelections` (checkbox limit), `maxLength` (text counter),
`placeholder`, and `allowsText: true` on an option to reveal a "please specify" box.

### Conditional logic

Add `showIf` to any question **or** whole section. Conditions are plain data, so the
survey stays serialisable if it later moves to a CMS or database.

```ts
// Show only when satisfaction was 2 or lower
showIf: { field: "overall_satisfaction", op: "lte", value: 2 }

// Show only when a specific checkbox was ticked
showIf: { field: "challenges_faced", op: "includes", value: "commission" }

// Combine with all / any
showIf: { all: [
  { field: "followup_ok", op: "equals", value: "yes" },
  { field: "tenure", op: "notEquals", value: "lt-6m" },
]}
```

Operators: `equals`, `notEquals`, `includes`, `notIncludes`, `answered`, `notAnswered`,
`lte`, `gte`, `countGte`, `countLte` (boxes ticked), `anyLte`, `anyGte` (any row of a
rating grid).

### Questions that follow from an earlier answer

`optionsFrom` builds a question's options out of what the agent already said, so a
follow-up can never offer a choice they did not make:

```ts
// Offers back only the challenges they ticked
optionsFrom: "challenges_faced"

// Offers back only the areas tied at their lowest grid score, and only when
// that score is 3 or worse
optionsFrom: "support_ratings",
optionsFromMaxScore: 3,
```

Such a question **hides itself when fewer than two options survive** — picking the worst
of one thing is not a question, and a required dropdown with no options would trap the
agent on the page. That rule replaces writing a `showIf` by hand.

If the agent later changes the answer it was derived from, a now-invalid choice is
rejected rather than submitted, in the browser and again on the server.

Hidden questions are skipped by validation, excluded from the progress bar, and their
answers are stripped from the submission — so backing out of a branch never leaves stray
data behind. Three branches are already wired up as working examples:

- Low satisfaction (≤ 2) reveals a "what is driving that?" follow-up
- Ticking any challenge reveals the "describe it" box
- Ticking two or more reveals "which one hurts you the most", listing only those
- Scoring two or more support areas equally lowest reveals "which needs the most
  improvement", listing only those areas
- Saying Yes to a tool request reveals "Please specify"

**Known follow-up:** `biggest_challenge` currently lists every challenge. It should be
narrowed to only the options the agent ticked in `challenges_faced` — that needs a small
renderer change (dynamic options), not just a schema edit.

## Where responses go

`POST /api/submit` re-runs the same validation as the browser, then appends each response
to `data/responses.jsonl` (git-ignored).

**This is placeholder storage.** Local files do not persist on serverless hosts such as
Vercel. Before launch, point the route at the real destination — SharePoint list, Google
Sheet, or a database — and add a duplicate check on `agent_name`.

## Notes

- Answers autosave to the device as the agent types, so a dropped connection or a locked
  phone does not cost them their progress.
- The form is light-only by design, so the brand palette is identical on every device.
- Consent wording references the PDPA 2010 — please have it reviewed before launch.
