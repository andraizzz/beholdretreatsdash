import { connection } from "next/server";
import { getCompetitorContentPulse } from "@/lib/sources/competitor-content";
import { cn } from "@/lib/utils";

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function formatDaysAgo(days: number | null): string {
  if (days === null) return "—";
  if (days < 1) return "today";
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  if (days < 60) return "~1 month ago";
  if (days < 365) return `~${Math.round(days / 30)} months ago`;
  const years = (days / 365).toFixed(1);
  return `~${years} years ago`;
}

function stalenessColor(days: number | null): string {
  if (days === null) return "text-muted-foreground";
  if (days < 30) return "text-emerald-700";
  if (days < 90) return "text-amber-700";
  return "text-red-700";
}

export async function CompetitorContentPulse() {
  await connection();

  let rows;
  try {
    rows = await getCompetitorContentPulse();
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load competitor content:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-2">Competitor</th>
              <th className="text-left px-3 py-2">Last activity</th>
              <th className="text-left px-3 py-2">Recent topics</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const days = daysSince(row.lastPostAt);
              const isBehold = row.name === "Behold Retreats";
              return (
                <tr
                  key={row.name}
                  className={cn(
                    "border-t align-top",
                    isBehold && "bg-secondary/30",
                  )}
                >
                  <td className="px-3 py-2 font-medium">
                    {row.name}
                    {isBehold && (
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        (us)
                      </span>
                    )}
                    {row.error && (
                      <div
                        className="text-[10px] text-red-600 mt-0.5"
                        title={row.error}
                      >
                        fetch error — investigate
                      </div>
                    )}
                  </td>
                  <td className={cn("px-3 py-2", stalenessColor(days))}>
                    {row.hasBlog ? formatDaysAgo(days) : "no blog"}
                    {row.lastPostAt && (
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {row.lastPostAt}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {row.topics.length > 0
                      ? row.topics.join(", ")
                      : row.hasBlog
                        ? "no recent posts to cluster"
                        : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="text-[10px] text-muted-foreground px-1">
        &ldquo;Last activity&rdquo; is the most recent post or update per site.
        Publishing cadence isn&apos;t shown because sitemap &ldquo;last-modified&rdquo;
        dates conflate real new posts with bulk edits (e.g. Behold&apos;s Jul 14
        domain migration re-stamped every historical post).
      </div>
    </div>
  );
}
