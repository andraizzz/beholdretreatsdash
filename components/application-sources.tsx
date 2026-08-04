import { connection } from "next/server";
import { getTypeformSources, isTypeformConfigured } from "@/lib/sources/typeform";
import { MetricCard } from "@/components/metric-card";
import { SectionTitle } from "@/components/placeholder";
import { cn } from "@/lib/utils";

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export async function ApplicationSources({ days = 7 }: { days?: number }) {
  // Before the configured check, so the unconfigured state can't be baked
  // into the static shell and survive the token being added later.
  await connection();

  if (!isTypeformConfigured()) {
    return (
      <section>
        <SectionTitle
          title="How applicants say they found us"
          subtitle="Self-reported source, straight from the application form"
        />
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          Typeform isn&apos;t connected yet. Add a Personal Access Token as{" "}
          <code>TYPEFORM_TOKEN</code> to pull the &ldquo;How did you hear about
          Behold Retreats?&rdquo; answers in here each week.
        </div>
      </section>
    );
  }

  let summary;
  try {
    summary = await getTypeformSources(days);
  } catch (error) {
    return (
      <section>
        <SectionTitle title="How applicants say they found us" />
        <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
          Couldn&apos;t load Typeform data:{" "}
          {error instanceof Error ? error.message : String(error)}
        </div>
      </section>
    );
  }

  const { total, previousTotal, rows } = summary;

  return (
    <section className="space-y-4">
      <SectionTitle
        title="How applicants say they found us"
        subtitle={`Self-reported on the application form — last ${days} days vs. the ${days} before. This is what people say, GA4 above is what the browser reports.`}
      />

      {total === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
          No applications answered this question in the last {days} days.
        </div>
      ) : (
        <>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <MetricCard
              label="Applications"
              value={formatNumber(total)}
              delta={{ value: pctDelta(total, previousTotal) }}
              hint="answered the 'how did you hear' question"
            />
            {rows.slice(0, 3).map((row) => (
              <MetricCard
                key={row.label}
                label={row.label}
                value={formatNumber(row.count)}
                hint={`${(row.share * 100).toFixed(0)}% of applicants`}
              />
            ))}
          </div>

          <div className="rounded-md border p-4 space-y-2.5">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-44 shrink-0 text-sm font-medium truncate">
                  {row.label}
                </div>
                <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#d3a95c]"
                    style={{ width: `${Math.max(row.share * 100, 1.5)}%` }}
                  />
                </div>
                <div className="w-28 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                  {formatNumber(row.count)} · {(row.share * 100).toFixed(0)}%
                </div>
                <div
                  className={cn(
                    "w-16 shrink-0 text-right text-sm font-medium tabular-nums",
                    row.deltaPct !== null &&
                      row.deltaPct > 0 &&
                      "text-emerald-600",
                    row.deltaPct !== null && row.deltaPct < 0 && "text-red-600",
                    (row.deltaPct === null || row.deltaPct === 0) &&
                      "text-muted-foreground",
                  )}
                >
                  {row.deltaPct === null
                    ? "new"
                    : row.deltaPct === 0
                      ? "—"
                      : `${row.deltaPct > 0 ? "↑" : "↓"} ${Math.abs(row.deltaPct)}%`}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
