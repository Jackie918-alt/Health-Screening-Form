/**
 * One response per NRIC.
 *
 * The agent may type `030405-10-1234` or `030405101234` — the validator accepts
 * both — so uniqueness has to compare digits only. Everything that decides
 * "is this the same person" goes through `normaliseNric`, in the app and in the
 * database, or the two would disagree about what counts as a duplicate.
 */

/**
 * Digits only. Returns "" for anything that is not a usable NRIC.
 *
 * Stored answers are normalised through this on the way in, so the stored
 * value is always canonical and a duplicate check is a plain equality match
 * rather than anything the database has to compute.
 */
export function normaliseNric(value: unknown): string {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  return digits.length === 12 ? digits : "";
}

/** Raised when an NRIC has already answered. Carries no other detail. */
export class DuplicateResponseError extends Error {
  constructor() {
    super("A response has already been recorded for this NRIC.");
    this.name = "DuplicateResponseError";
  }
}
