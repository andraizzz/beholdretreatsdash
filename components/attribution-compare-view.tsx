import { connection } from "next/server";
import { getGa4Summary, isGa4Configured } from "@/lib/sources/ga4";
import { getTypeformSources, isTypeformConfigured } from "@/lib/sources/typeform";
import { buildAttributionComparison } from "@/lib/attribution-compare";
import { AttributionDonut } from "@/components/attribution-donut";
import { cn } from "@/lib/utils";

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export async function AttributionCompareView() {
  await connection();

  if (!isGa4Configured() || !isTypeformConfigured()) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Needs both GA4 and Typeform connected to compare.
      </div>
    );
  }

  let weekly;
  let typeformWeekly;
  try {
    [weekly, typeformWeekly] = await Promise.all([
      getGa4Summary(7),
      getTypeformSources(7),
    ]);
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load comparison data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const comparison = buildAttributionComparison(
    weekly.byChannel,
    typeformWeekly.rows,
  );

  const ga4Data = comparison.rows.map((r) => ({
    name: r.label,
    value: r.ga4Sessions,
  }));
  const typeformData = comparison.rows.map((r) => ({
    name: r.label,
    value: r.typeformCount,
  }));

  const bigGaps = comparison.rows
    .filter((r) => Math.abs(r.gap) >= 10)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));

  return (
    <div className="space-y-4">
      <div className="grid gap-6 md:grid-cols-2 rounded-md border p-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-center mb-2">
            GA4 traffic (what the browser reports)
          </div>
          <AttributionDonut data={ga4Data} />
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground text-center mb-2">
            Applicant self-report (what people say)
          </div>
          <AttributionDonut data={typeformData} />
        </div>
      </div>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Channel</th>
              <th className="text-right px-3 py-2">GA4 traffic %</th>
              <th className="text-right px-3 py-2">Applicant %</th>
              <th className="text-right px-3 py-2">Gap</th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => {
              const meaningful = Math.abs(row.gap) >= 10;
              return (
                <tr key={row.category} className="border-t">
                  <td className="px-3 py-2 font-medium">{row.label}</td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {row.ga4Pct.toFixed(0)}%
                    <span className="text-xs text-muted-foreground ml-1">
                      ({formatNumber(row.ga4Sessions)})
                    </span>
                  </td>
                  <td className="text-right px-3 py-2 tabular-nums">
                    {row.typeformPct.toFixed(0)}%
                    <span className="text-xs text-muted-foreground ml-1">
                      ({formatNumber(row.typeformCount)})
                    </span>
                  </td>
                  <td
                    className={cn(
                      "text-right px-3 py-2 tabular-nums font-medium",
                      meaningful && row.gap > 0 && "text-amber-700",
                      meaningful && row.gap < 0 && "text-amber-700",
                      !meaningful && "text-muted-foreground",
                    )}
                  >
                    {row.gap > 0 ? "+" : ""}
                    {row.gap.toFixed(0)}pt
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {bigGaps.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm">
          <div className="font-medium text-amber-900 mb-1">
            Attribution mismatches worth investigating
          </div>
          <ul className="space-y-1 text-amber-800">
            {bigGaps.map((row) => (
              <li key={row.category}>
                <span className="font-medium">{row.label}:</span>{" "}
                {row.gap > 0
                  ? `applicants report ${row.typeformPct.toFixed(0)}% but GA4 only sees ${row.ga4Pct.toFixed(0)}% — likely missing UTMs or misclassified as Direct.`
                  : `GA4 shows ${row.ga4Pct.toFixed(0)}% of traffic but only ${row.typeformPct.toFixed(0)}% of applicants cite it — possibly misattributed or low-intent traffic.`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(comparison.unmappedGa4.length > 0 ||
        comparison.unmappedTypeform.length > 0) && (
        <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground space-y-2">
          <div className="font-medium">
            Attribution blind spots (no clean cross-source mapping)
          </div>
          {comparison.unmappedGa4.length > 0 && (
            <div>
              <span className="font-medium">GA4-only categories:</span>{" "}
              {comparison.unmappedGa4
                .map((u) => `${u.channel} (${u.pct.toFixed(0)}%)`)
                .join(", ")}
            </div>
          )}
          {comparison.unmappedTypeform.length > 0 && (
            <div>
              <span className="font-medium">Typeform-only categories:</span>{" "}
              {comparison.unmappedTypeform
                .map((u) => `${u.label} (${u.pct.toFixed(0)}%)`)
                .join(", ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
