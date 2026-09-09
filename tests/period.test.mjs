/** The response window: open, not yet, and closed. */

import { harness } from "./assert.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const p = await import(path.join(root, "src/lib/survey-period.ts"));
const { check, done } = harness("period");

// The window is 16 Sep 2026 – 15 Oct 2026 inclusive, in Malaysia time.
const at = (iso) => new Date(iso);

check("well before the window", p.periodPhase(at("2026-08-01T00:00:00Z")), "before");
check("the day before opening", p.periodPhase(at("2026-09-15T04:00:00Z")), "before");
check("opening day is open", p.periodPhase(at("2026-09-16T04:00:00Z")), "open");
check("mid-window is open", p.periodPhase(at("2026-10-01T04:00:00Z")), "open");
check("closing day is still open", p.periodPhase(at("2026-10-15T04:00:00Z")), "open");
check("the day after closing", p.periodPhase(at("2026-10-16T04:00:00Z")), "after");
check("well after the window", p.periodPhase(at("2026-12-01T00:00:00Z")), "after");

// Malaysia is UTC+8, so the boundaries must follow the local calendar day.
// 15 Sep 23:00 UTC is already 16 Sep in Kuala Lumpur — the survey should be open.
check("opens at local midnight, not UTC midnight",
  p.periodPhase(at("2026-09-15T16:00:00Z")), "open");
// 15 Oct 17:00 UTC is 16 Oct locally — closed.
check("closes at the end of the local day",
  p.periodPhase(at("2026-10-15T16:00:00Z")), "after");
// 15 Oct 15:59 UTC is still 15 Oct locally (23:59) — open.
check("the final local minute is still open",
  p.periodPhase(at("2026-10-15T15:59:00Z")), "open");

check("isSurveyOpen agrees with the phase", p.isSurveyOpen(at("2026-10-01T04:00:00Z")), true);
check("isSurveyOpen is false once closed", p.isSurveyOpen(at("2026-11-01T04:00:00Z")), false);

check("the label still reads correctly", p.formatSurveyPeriod("en"),
  "16 September 2026 – 15 October 2026");
check("and in Malay", p.formatSurveyPeriod("ms"), "16 September 2026 – 15 Oktober 2026");

done();
