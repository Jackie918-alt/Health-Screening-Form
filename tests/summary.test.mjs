/** Dashboard aggregates. */

import { harness } from "./assert.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { summarise } = await import(path.join(root, "src/lib/responses/summary.ts"));
const { check, done } = harness("summary");

const make = (answers, language = "en", receivedAt = "2026-09-20T00:00:00.000Z") =>
  ({ id: Math.random().toString(36).slice(2), surveyId: "s", version: "v", language,
     submittedAt: receivedAt, receivedAt, answers });

check("no responses gives an empty summary", summarise([]).total, 0);
check("no responses reports no satisfaction rather than zero", summarise([]).satisfaction, null);
check("no responses reports no NPS rather than zero", summarise([]).nps, null);

const responses = [
  make({ overall_satisfaction: 5, recommend_likelihood: 10,
         challenges_faced: ["commission", "prospecting"],
         support_ratings: { training: 5, marketing: 2, leads: 1 } }),
  make({ overall_satisfaction: 3, recommend_likelihood: 8,
         challenges_faced: ["commission"],
         support_ratings: { training: 3, marketing: 2, leads: 2 } }, "ms"),
  make({ overall_satisfaction: 1, recommend_likelihood: 2,
         challenges_faced: ["commission", "pricing"],
         support_ratings: { training: 4, marketing: 1, leads: 3 } }, "ms",
       "2026-09-25T00:00:00.000Z"),
  // Someone who skipped the optional scored questions entirely.
  make({ agent_name: "Skipper" }),
];

const s = summarise(responses);

check("total counts every response", s.total, 4);
check("satisfaction averages only those who answered", Number(s.satisfaction.mean.toFixed(2)), 3);
check("satisfaction reports its base", s.satisfaction.base, 3);

// 1 promoter (10), 1 passive (8), 1 detractor (2) -> (1-1)/3 = 0
check("NPS counts promoters", s.nps.promoters, 1);
check("NPS counts passives", s.nps.passives, 1);
check("NPS counts detractors", s.nps.detractors, 1);
check("NPS is promoters minus detractors over the base", s.nps.score, 0);
check("NPS ignores those who skipped it", s.nps.base, 3);

check("the top challenge is the most ticked",
  s.topChallenges[0].label, "Commission structure or payout timing");
check("the top challenge counts every mention", s.topChallenges[0].count, 3);
check("share is out of those who answered the question, not everyone",
  s.topChallenges[0].share, 1);

check("the weakest area is listed first", s.weakestAreas[0].label, "Marketing materials and content");
check("the weakest area's mean is right",
  Number(s.weakestAreas[0].mean.toFixed(2)), 1.67);
check("a stronger area ranks lower",
  s.weakestAreas.at(-1).label, "Product knowledge, training and coaching");

check("languages are counted", s.byLanguage.find((l) => l.label === "Bahasa Melayu").count, 2);
check("the most recent submission is reported", s.lastReceivedAt, "2026-09-25T00:00:00.000Z");

// Malay labels when the dashboard asks for them.
const ms = summarise(responses, "ms");
check("labels can resolve in Malay",
  ms.topChallenges[0].label, "Struktur komisen atau masa pembayaran");

// Bad data must not crash the dashboard.
const messy = summarise([
  make({ overall_satisfaction: "not a number", recommend_likelihood: null,
         challenges_faced: "not an array", support_ratings: { training: "x" } }),
]);
check("junk values are ignored rather than thrown on", messy.satisfaction, null);
check("junk grids produce no areas", messy.weakestAreas.length, 0);
check("a non-array challenge list is ignored", messy.topChallenges.length, 0);

done();
