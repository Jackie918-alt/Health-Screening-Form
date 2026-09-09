/** Turning stored answer ids back into readable text, and into CSV. */

import { harness } from "./assert.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { presentAnswers, firstComment } = await import(path.join(root, "src/lib/responses/present.ts"));
const { toCsv } = await import(path.join(root, "src/lib/responses/csv.ts"));
const { check, done } = harness("export");

const answers = {
  agent_name: "Aisyah binti Rahman",
  nric: "900101101234",
  region: "selangor",
  tenure: "1-2y",
  overall_satisfaction: 4,
  challenges_faced: ["commission", "prospecting"],
  support_ratings: { training: 4, marketing: 2 },
  help_channel: "other",
  help_channel__other: "My regional manager",
  anything_else: "Payouts slipped twice this quarter.",
  consent: "agreed",
};

const shown = Object.fromEntries(presentAnswers(answers, "en").map((a) => [a.questionId, a.value]));

check("a dropdown id becomes its label", shown.region, "Selangor");
check("a radio id becomes its label", shown.tenure, "1 to 2 years");
check("a checkbox list becomes readable labels",
  shown.challenges_faced, "Commission structure or payout timing; Finding new prospects and leads");
check("a grid becomes one line per row",
  shown.support_ratings, "Product knowledge, training and coaching: 4\nMarketing materials and content: 2");
check("a number passes through", shown.overall_satisfaction, "4");
check("consent reads as words, not a code", shown.consent, "Agreed");
check("free text typed beside an option is kept", shown.help_channel__other, "My regional manager");

// Malay responses must resolve against the Malay labels.
const ms = Object.fromEntries(presentAnswers(answers, "ms").map((a) => [a.questionId, a.value]));
check("labels resolve in Malay too", ms.tenure, "1 hingga 2 tahun");

// The list preview must not surface personal details.
check("the preview uses a long-form comment", firstComment(answers), "Payouts slipped twice this quarter.");
check("the preview is not the agent's name", firstComment(answers).includes("Aisyah"), false);
check("the preview is not the NRIC", firstComment(answers).includes("900101"), false);
check("no comment gives an empty preview", firstComment({ agent_name: "Someone" }), "");

// An answer to a since-deleted option is still data — show it rather than drop it.
check("an unknown option id is shown as-is",
  presentAnswers({ region: "atlantis" }, "en").find((a) => a.questionId === "region").value, "atlantis");

const csv = toCsv([
  { id: "row-1", surveyId: "s", version: "v1", language: "en",
    submittedAt: "2026-09-20T02:00:00.000Z", receivedAt: "2026-09-20T02:00:01.000Z", answers },
]);

check("the file starts with a BOM so Excel reads UTF-8", csv.charCodeAt(0), 0xfeff);
check("rows end CRLF", csv.includes("\r\n"));
check("the header names questions, not ids", csv.includes('"State you operate in"'));
check("a question allowing free text gets its own column", csv.includes('"(specified)"') || csv.includes('specified)"'));

// Parse it back the way a spreadsheet would.
const parse = (text) => {
  const out = [[""]];
  let row = 0, col = 0, quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { out[row][col] += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else out[row][col] += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { col += 1; out[row][col] = ""; }
    else if (c === "\r" && text[i + 1] === "\n") { row += 1; col = 0; out[row] = [""]; i += 1; }
    else out[row][col] += c;
  }
  return out.filter((r) => r.some((cell) => cell !== ""));
};

const [header, first] = parse(csv.slice(1));
const cell = (name) => first[header.indexOf(name)];

check("one data row for one response", parse(csv.slice(1)).length, 2);
check("every row has as many cells as the header", first.length, header.length);
check("a text answer survives the round trip", cell("Full name (as per NRIC)"), "Aisyah binti Rahman");
check("a label is exported, not an id", cell("State you operate in"), "Selangor");
check("a grid exports as readable lines",
  cell("Rate each area below"), "Product knowledge, training and coaching: 4\nMarketing materials and content: 2");
check("the response id is exported for cross-reference", cell("Response ID"), "row-1");

// A comma and a quote inside an answer must not break the columns.
const tricky = toCsv([
  { id: "row-2", surveyId: "s", version: "v1", language: "en", submittedAt: "", receivedAt: "",
    answers: { anything_else: 'Pay is late, and "support" is slow' } },
]);
const [h2, r2] = parse(tricky.slice(1));
check("commas and quotes inside an answer stay in one cell",
  r2[h2.indexOf("Is there anything else you'd like to share with us?")],
  'Pay is late, and "support" is slow');
check("a tricky answer does not add columns", r2.length, h2.length);

done();
