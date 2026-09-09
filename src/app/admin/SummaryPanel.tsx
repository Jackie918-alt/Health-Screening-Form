import type { Summary } from "@/lib/responses/summary";

/**
 * The at-a-glance panel above the response list.
 *
 * Every figure states the number of people it is based on. An average of 2.1
 * means something very different from three respondents than from three
 * hundred, and the panel should not let anyone forget which they are looking
 * at.
 */
export function SummaryPanel({ summary }: { summary: Summary }) {
  if (summary.total === 0) return null;

  return (
    <section aria-label="Summary" className="mt-6 space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Responses" value={String(summary.total)} caption={lastLine(summary.lastReceivedAt)} />

        <Stat
          label="Avg. satisfaction"
          value={summary.satisfaction ? summary.satisfaction.mean.toFixed(1) : "—"}
          caption={summary.satisfaction ? `out of 5 · ${summary.satisfaction.base} answered` : "nobody answered yet"}
          tone={summary.satisfaction ? scoreTone(summary.satisfaction.mean, 5) : undefined}
        />

        <Stat
          label="NPS"
          value={summary.nps ? String(summary.nps.score) : "—"}
          caption={
            summary.nps
              ? `${summary.nps.promoters} promoters · ${summary.nps.detractors} detractors`
              : "nobody answered yet"
          }
          tone={summary.nps ? npsTone(summary.nps.score) : undefined}
        />

        <Stat
          label="Weakest area"
          value={summary.weakestAreas[0] ? summary.weakestAreas[0].mean.toFixed(1) : "—"}
          caption={summary.weakestAreas[0]?.label ?? "no ratings yet"}
          tone={summary.weakestAreas[0] ? scoreTone(summary.weakestAreas[0].mean, 5) : undefined}
        />
      </div>

      {(summary.topChallenges.length > 0 || summary.weakestAreas.length > 0) && (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {summary.topChallenges.length > 0 && (
            <Panel title="Most-reported challenges">
              {summary.topChallenges.map((item) => (
                <Bar key={item.label} label={item.label} count={item.count} share={item.share} />
              ))}
            </Panel>
          )}

          {summary.weakestAreas.length > 0 && (
            <Panel title="Support areas, worst rated first">
              {summary.weakestAreas.map((area) => (
                <Bar
                  key={area.label}
                  label={area.label}
                  count={Number(area.mean.toFixed(1))}
                  share={area.mean / 5}
                  suffix={` / 5 · ${area.base} rated`}
                />
              ))}
            </Panel>
          )}
        </div>
      )}
    </section>
  );
}

function lastLine(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `latest ${new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(date)}`;
}

/** Red below 40% of the scale, amber below 60%, teal above. */
function scoreTone(mean: number, max: number): "good" | "warn" | "bad" {
  const share = mean / max;
  if (share < 0.4) return "bad";
  if (share < 0.6) return "warn";
  return "good";
}

function npsTone(score: number): "good" | "warn" | "bad" {
  if (score < 0) return "bad";
  if (score < 30) return "warn";
  return "good";
}

const TONE = {
  good: "text-teal-700",
  warn: "text-amber-700",
  bad: "text-red-600",
} as const;

function Stat({
  label,
  value,
  caption,
  tone,
}: {
  label: string;
  value: string;
  caption?: string;
  tone?: "good" | "warn" | "bad";
}) {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-card">
      <p className="font-display text-[11px] font-bold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className={`mt-1 font-display text-2xl font-extrabold ${tone ? TONE[tone] : "text-ink"}`}>
        {value}
      </p>
      {caption && <p className="mt-0.5 text-xs leading-snug text-ink-muted">{caption}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="font-display text-sm font-bold text-ink">{title}</h2>
      <div className="mt-3 space-y-2.5">{children}</div>
    </div>
  );
}

function Bar({
  label,
  count,
  share,
  suffix = "",
}: {
  label: string;
  count: number;
  share: number;
  suffix?: string;
}) {
  const percent = Math.round(share * 100);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 flex-1 truncate text-ink-soft" title={label}>
          {label}
        </span>
        <span className="shrink-0 font-display font-bold text-ink">
          {count}
          <span className="font-sans font-normal text-ink-muted">{suffix}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-brand-teal" style={{ width: `${Math.max(percent, 2)}%` }} />
      </div>
    </div>
  );
}
