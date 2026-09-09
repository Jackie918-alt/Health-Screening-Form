import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { getResponseStore } from "@/lib/responses";
import { firstComment } from "@/lib/responses/present";
import { SURVEY } from "@/lib/survey-content";
import { AdminHeader } from "./AdminChrome";

// Responses arrive continuously; a cached page would show stale counts.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  // Proxy already bounced anonymous traffic; this is the check that actually
  // guards the data, next to the read itself.
  await requireAdmin();

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const language = params.lang === "en" || params.lang === "ms" ? params.lang : undefined;

  const store = getResponseStore();
  const { rows, total } = await store.list({
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
    search: search || undefined,
    language,
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(search || language);
  const exportHref = `/api/admin/export${search || language ? `?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(language ? { lang: language } : {}) })}` : ""}`;

  return (
    <div className="min-h-dvh bg-canvas">
      <AdminHeader driver={store.driver} note={store.note} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        {store.driver === "file" && (
          <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <strong className="font-display font-bold">Storage is not durable.</strong> {store.note}
          </p>
        )}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">
              Responses
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              {total} {total === 1 ? "response" : "responses"}
              {filtered ? " matching this filter" : ""} · {SURVEY.sections.length} sections
            </p>
          </div>

          <a
            href={exportHref}
            className="focus-brand rounded-full border border-line bg-white px-5 py-2.5 font-display text-sm font-bold text-deep-700 transition-colors hover:border-teal-400 hover:bg-teal-50"
          >
            Download CSV
          </a>
        </div>

        <form method="get" className="mt-6 flex flex-wrap gap-3">
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search answers…"
            aria-label="Search answers"
            className="focus-brand min-w-56 flex-1 rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors hover:border-teal-300"
          />
          <select
            name="lang"
            defaultValue={language ?? ""}
            aria-label="Filter by language"
            className="focus-brand rounded-xl border border-line bg-white px-4 py-2.5 text-sm text-ink outline-none transition-colors hover:border-teal-300"
          >
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="ms">Bahasa Melayu</option>
          </select>
          <button
            type="submit"
            className="focus-brand rounded-full bg-brand-gradient px-6 py-2.5 font-display text-sm font-bold text-white shadow-lift"
          >
            Filter
          </button>
          {filtered && (
            <Link
              href="/admin"
              className="focus-brand self-center rounded-full px-3 py-2 text-sm font-semibold text-ink-muted underline-offset-4 hover:text-deep-700 hover:underline"
            >
              Clear
            </Link>
          )}
        </form>

        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
            <p className="font-display text-base font-bold text-ink">
              {filtered ? "No responses match this filter." : "No responses yet."}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              {filtered
                ? "Try a different search term or clear the filter."
                : "Responses appear here the moment an agent submits the form."}
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60">
                  <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-ink-muted">
                    Received
                  </th>
                  <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-ink-muted">
                    Language
                  </th>
                  <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-ink-muted">
                    First comment
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line/70 last:border-0 hover:bg-teal-50/40">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                      {formatDate(row.receivedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-canvas px-2.5 py-1 font-display text-[11px] font-bold uppercase text-ink-soft">
                        {row.language}
                      </span>
                    </td>
                    <td className="max-w-md px-4 py-3 text-ink-soft">
                      <span className="line-clamp-2">
                        {firstComment(row.answers) || (
                          <span className="text-ink-muted">No free-text answer</span>
                        )}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <Link
                        href={`/admin/${row.id}`}
                        className="focus-brand rounded-lg font-display text-sm font-bold text-teal-700 underline-offset-4 hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav className="mt-6 flex items-center justify-between gap-4" aria-label="Pagination">
            <PagerLink page={page - 1} disabled={page <= 1} params={params}>
              ← Previous
            </PagerLink>
            <p className="text-sm text-ink-muted">
              Page {page} of {pages}
            </p>
            <PagerLink page={page + 1} disabled={page >= pages} params={params}>
              Next →
            </PagerLink>
          </nav>
        )}
      </main>
    </div>
  );
}

function PagerLink({
  page,
  disabled,
  params,
  children,
}: {
  page: number;
  disabled: boolean;
  params: Record<string, string | string[] | undefined>;
  children: React.ReactNode;
}) {
  if (disabled) {
    return <span className="rounded-full px-4 py-2 text-sm text-ink-muted/60">{children}</span>;
  }
  const query = new URLSearchParams();
  if (typeof params.q === "string" && params.q) query.set("q", params.q);
  if (typeof params.lang === "string" && params.lang) query.set("lang", params.lang);
  query.set("page", String(page));
  return (
    <Link
      href={`/admin?${query}`}
      className="focus-brand rounded-full border border-line bg-white px-4 py-2 font-display text-sm font-bold text-deep-700 transition-colors hover:border-teal-400 hover:bg-teal-50"
    >
      {children}
    </Link>
  );
}
