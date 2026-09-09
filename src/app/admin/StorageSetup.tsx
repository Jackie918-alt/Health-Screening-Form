/**
 * Shown instead of the response list when Supabase is not configured.
 *
 * An admin who opens this screen needs to know exactly what to do next, so it
 * names the missing variables rather than showing a generic error.
 */
export function StorageSetup({ missing }: { missing: string[] }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10">
      <div className="rounded-3xl border border-amber-300 bg-amber-50 p-7">
        <h1 className="font-display text-xl font-extrabold tracking-tight text-amber-950">
          Storage is not connected yet
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-amber-900">
          Responses have nowhere to go, so the survey is not accepting submissions and there is
          nothing to show here. Connect Supabase to switch both on.
        </p>

        <ol className="mt-5 space-y-3 text-sm leading-relaxed text-amber-900">
          <li>
            <strong className="font-display font-bold">1.</strong> In the Supabase SQL editor, run
            the script at <code className="font-mono text-xs">supabase/schema.sql</code>.
          </li>
          <li>
            <strong className="font-display font-bold">2.</strong> Copy the project URL and the{" "}
            <em>service role</em> key from Supabase → Project Settings → API.
          </li>
          <li>
            <strong className="font-display font-bold">3.</strong> Add them in Vercel → Settings →
            Environment Variables, then redeploy.
          </li>
        </ol>

        <p className="mt-5 font-display text-xs font-bold uppercase tracking-wide text-amber-800">
          Missing on this deployment
        </p>
        <ul className="mt-2 space-y-1">
          {missing.map((name) => (
            <li key={name}>
              <code className="rounded bg-amber-100 px-2 py-1 font-mono text-xs text-amber-950">
                {name}
              </code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
