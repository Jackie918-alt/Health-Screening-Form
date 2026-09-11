/** One response per NRIC. */

import { harness } from "./assert.mjs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { normaliseNric, DuplicateResponseError } = await import(path.join(root, "src/lib/responses/nric.ts"));
const { check, done } = harness("nric");

check("digits pass through", normaliseNric("030405101234"), "030405101234");
check("dashes are stripped", normaliseNric("030405-10-1234"), "030405101234");
check("spaces are stripped", normaliseNric("030405 10 1234"), "030405101234");
check("mixed punctuation is stripped", normaliseNric(" 030405 - 10 - 1234 "), "030405101234");
check("the two spellings of one NRIC match",
  normaliseNric("030405-10-1234") === normaliseNric("030405101234"), true);

check("too short is rejected", normaliseNric("0304051012"), "");
check("too long is rejected", normaliseNric("0304051012345"), "");
check("empty is rejected", normaliseNric(""), "");
check("letters alone are rejected", normaliseNric("abcdefghijkl"), "");
check("undefined is rejected", normaliseNric(undefined), "");
check("a number is rejected — answers store NRIC as text", normaliseNric(30405101234), "");
check("two different NRICs do not collide",
  normaliseNric("030405101234") === normaliseNric("030405101235"), false);

check("the duplicate error is identifiable",
  new DuplicateResponseError() instanceof DuplicateResponseError, true);
check("the duplicate error names itself", new DuplicateResponseError().name, "DuplicateResponseError");

done();
