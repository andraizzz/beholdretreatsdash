import { getWeeklyInsights, getCurrentWeekStart } from "@/lib/insights";

export async function GET() {
  const weekStart = getCurrentWeekStart();
  const start = Date.now();
  try {
    const insights = await getWeeklyInsights(weekStart);
    return Response.json({
      weekStart,
      durationMs: Date.now() - start,
      firstTakeaway: insights.takeaways[0],
    });
  } catch (error) {
    return Response.json(
      {
        weekStart,
        durationMs: Date.now() - start,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
