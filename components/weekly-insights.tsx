import {
  getWeeklyInsights,
  isInsightsConfigured,
  getCurrentWeekStart,
  weekRangeLabel,
} from "@/lib/insights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { connection } from "next/server";

export async function WeeklyInsights() {
  await connection();

  if (!isInsightsConfigured()) return null;

  const weekStart = getCurrentWeekStart();

  let insights;
  try {
    insights = await getWeeklyInsights(weekStart);
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-4 text-sm text-red-600">
        Couldn&apos;t generate this week&apos;s takeaways:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Week of {weekRangeLabel(weekStart)} — generated once per week, doesn&apos;t
        change if you hit Refresh
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top 3 takeaways this week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside text-sm">
              {insights.takeaways.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top 3 recommendations for next week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside text-sm">
              {insights.recommendations.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
