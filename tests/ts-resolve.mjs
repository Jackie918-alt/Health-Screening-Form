/**
 * Lets Node import the app's TypeScript the way the bundler does.
 *
 * The source uses extensionless relative imports (`./i18n`, `../survey-types`),
 * which Node's ESM resolver rejects. This retries a failed relative resolution
 * with `.ts` and `/index.ts` appended — the same two shapes the bundler tries —
 * so the suite can exercise the real modules rather than copies of them.
 */

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (specifier.startsWith(".") || specifier.startsWith("/")) {
      for (const suffix of [".ts", ".tsx", "/index.ts"]) {
        try {
          return await nextResolve(specifier + suffix, context);
        } catch {
          // Try the next shape.
        }
      }
    }
    throw error;
  }
}
