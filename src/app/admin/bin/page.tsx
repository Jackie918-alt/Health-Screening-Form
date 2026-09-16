import Link from "next/link";
import { requireAdmin } from "@/lib/admin-session";
import { getStorageStatus } from "@/lib/responses";
import { firstComment } from "@/lib/responses/present";
import { AdminHeader } from "../AdminChrome";
import { RestoreButton } from "../RestoreButton";
import { StorageSetup } from "../StorageSetup";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}

export default async function BinPage({ searchParams }: PageProps<"/admin/bin">) {
  await requireAdmin();

  const storage = getStorageStatus();
  if (!storage.ok) {
    return (
      <div className="min-h-dvh bg-canvas">
        <AdminHeader driver="none" note={storage.reason} />
        <StorageSetup missing={storage.missing} />
      </div>
    );
  }

  const params = await searchParams;
  const store = storage.store;
  const { rows, total } = await store.list({ limit: PAGE_SIZE, offset: 0, deleted: true });

  return (
    <div className="min-h-dvh bg-canvas">
      <AdminHeader driver={store.driver} note={store.note} />

      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        <Link
          href="/admin"
          className="focus-brand rounded-lg font-display text-sm font-bold text-teal-700 underline-offset-4 hover:underline"
        >
          ← All responses
        </Link>

        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink">Bin</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {total} deleted {total === 1 ? "response" : "responses"}. These are excluded from the
          dashboard figures and the CSV export, and their NRIC is free to answer again.
        </p>

        {params.restored === "1" && (
          <p className="mt-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-deep-700">
            Response restored.
          </p>
        )}

        {rows.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-white px-6 py-16 text-center">
            <p className="font-display text-base font-bold text-ink">The bin is empty.</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Deleted responses appear here and can be restored at any time. Nothing is ever
              permanently removed from this screen.
            </p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-card">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-canvas/60">
                  <Th>Deleted</Th>
                  <Th>Originally received</Th>
                  <Th>Language</Th>
                  <Th>First comment</Th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line/70 last:border-0 hover:bg-canvas/50">
                    <td className="whitespace-nowrap px-4 py-3 text-ink-soft">
                      {formatDate(row.deletedAt)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-ink-muted">
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
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/${row.id}`}
                          className="focus-brand rounded-lg font-display text-sm font-bold text-ink-soft underline-offset-4 hover:underline"
                        >
                          View
                        </Link>
                        <RestoreButton id={row.id} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-display text-xs font-bold uppercase tracking-wide text-ink-muted">
      {children}
    </th>
  );
}
