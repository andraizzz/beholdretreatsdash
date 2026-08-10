import { connection } from "next/server";
import { getTrends, TRENDS_TERMS } from "@/lib/sources/trends";
import { CompetitorTrendsChart } from "@/components/competitor-trends-chart";

export async function CompetitorTrends() {
  await connection();

  let data;
  try {
    data = await getTrends();
  } catch {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Google Trends is temporarily unavailable. It's an unofficial API with
        no uptime guarantee, so this can happen — try again later.
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Google Trends returned no data for this comparison.
      </div>
    );
  }

  return <CompetitorTrendsChart terms={TRENDS_TERMS} data={data} />;
}
