import { connection } from "next/server";
import { getTypeformTrend, isTypeformConfigured } from "@/lib/sources/typeform";
import { ApplicationTrendChart } from "@/components/application-trend-chart";

export async function ApplicationTrend({ days = 7 }: { days?: number }) {
  await connection();

  // ApplicationSources renders the "Typeform isn't connected yet" message —
  // avoid showing it twice on the same page.
  if (!isTypeformConfigured()) return null;

  let trend;
  try {
    trend = await getTypeformTrend(days);
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load Typeform data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return <ApplicationTrendChart data={trend} />;
}
