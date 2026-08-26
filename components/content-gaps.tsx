import { connection } from "next/server";
import { getContentGaps } from "@/lib/sources/competitor-content";
import { Badge } from "@/components/ui/badge";

export async function ContentGaps() {
  await connection();

  let analysis;
  try {
    analysis = await getContentGaps();
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load content gaps:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const { gaps, beholdStrengths, competitorPostCount, beholdPostCount } =
    analysis;

  if (gaps.length === 0 && beholdStrengths.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        No gap analysis available yet. This needs recent posts from both
        Behold and at least one competitor
        {competitorPostCount === 0
          ? " — no competitor posts were fetched."
          : beholdPostCount === 0
            ? " — no Behold posts were fetched."
            : ", and the analysis call didn't return. It retries on the next weekly refresh."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {gaps.length > 0 && (
        <div className="space-y-2.5">
          {gaps.map((gap) => (
            <div key={gap.topic} className="rounded-md border p-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="font-medium text-sm">{gap.topic}</div>
                <div className="flex gap-1 flex-wrap">
                  {gap.coveredBy.map((name) => (
                    <Badge
                      key={name}
                      variant="outline"
                      className="text-[10px] border-amber-200 bg-amber-50 text-amber-700"
                    >
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-xs text-muted-foreground leading-snug">
                {gap.whyItMatters}
              </div>
              <div className="text-xs leading-snug">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mr-1.5">
                  Suggested angle
                </span>
                {gap.suggestedAngle}
              </div>
            </div>
          ))}
        </div>
      )}

      {beholdStrengths.length > 0 && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-[10px] uppercase tracking-wide text-emerald-800 font-medium mb-1.5">
            Topics we own — worth defending
          </div>
          <ul className="text-sm text-emerald-900 space-y-1">
            {beholdStrengths.map((s) => (
              <li key={s} className="leading-snug">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground px-1">
        Based on {beholdPostCount} recent Behold posts vs.{" "}
        {competitorPostCount} competitor posts. Every gap traces back to a
        title a competitor actually published, not to general knowledge of
        the space. Refreshed weekly.
      </div>
    </div>
  );
}
