import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin-session";
import { getStorageStatus } from "@/lib/responses";
import { presentAnswers } from "@/lib/responses/present";
import { AdminHeader } from "../AdminChrome";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-MY", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(date);
}

export default async function ResponsePage({ params }: PageProps<"/admin/[id]">) {
  await requireAdmin();

  const { id } = await params;
  const storage = getStorageStatus();
  if (!storage.ok) notFound();

  const store = storage.store;
  const response = await store.get(id);
  if (!response) notFound();

  // Rendered in the language the agent answered in, so their words and the
  // questions they actually saw stay together.
  const answers = presentAnswers(response.answers, response.language);

  return (
    <div className="min-h-dvh bg-canvas">
      <AdminHeader driver={store.driver} note={store.note} />

      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <Link
          href="/admin"
          className="focus-brand rounded-lg font-display text-sm font-bold text-teal-700 underline-offset-4 hover:underline"
        >
          ← All responses
        </Link>

        <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-ink">
          Response
        </h1>

        <dl className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-line bg-white p-5 text-sm shadow-card sm:grid-cols-2">
          <Meta label="Received">{formatDate(response.receivedAt)}</Meta>
          <Meta label="Submitted (device clock)">{formatDate(response.submittedAt)}</Meta>
          <Meta label="Language">
            {response.language === "ms" ? "Bahasa Melayu" : "English"}
          </Meta>
          <Meta label="Survey version">{response.version}</Meta>
          <Meta label="Response ID">
            <code className="font-mono text-xs text-ink-soft">{response.id}</code>
          </Meta>
        </dl>

        <div className="mt-6 space-y-4">
          {answers.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line bg-white px-6 py-12 text-center text-sm text-ink-muted">
              This response has no stored answers.
            </p>
          ) : (
            answers.map((answer) => (
              <div
                key={answer.questionId}
                className="rounded-2xl border border-line bg-white p-5 shadow-card"
              >
                <p className="font-display text-sm font-bold leading-snug text-ink">
                  {answer.label}
                </p>
                <p
                  className={[
                    "mt-2 whitespace-pre-line text-[15px] leading-[1.7]",
                    answer.freeText ? "text-ink" : "text-ink-soft",
                  ].join(" ")}
                >
                  {answer.value}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-display text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {label}
      </dt>
      <dd className="mt-0.5 text-ink-soft">{children}</dd>
    </div>
  );
}
