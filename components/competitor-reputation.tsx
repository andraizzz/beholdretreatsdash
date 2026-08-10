import { connection } from "next/server";
import {
  getCompetitorReputation,
  isPlacesConfigured,
} from "@/lib/sources/places";

export async function CompetitorReputation() {
  await connection();

  if (!isPlacesConfigured()) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Google ratings aren&apos;t connected yet. Add a Places API key as{" "}
        <code>GOOGLE_PLACES_API_KEY</code> to see review scores here.
      </div>
    );
  }

  let rows;
  try {
    rows = await getCompetitorReputation();
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load Google ratings:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
      {rows.map((row) => (
        <div key={row.name} className="rounded-md border p-4">
          <div className="text-sm font-medium">{row.name}</div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-semibold tracking-tight">
              {row.rating !== null ? row.rating.toFixed(1) : "—"}
            </span>
            {row.rating !== null && (
              <span className="text-muted-foreground text-sm">★ / 5</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {row.reviewCount !== null
              ? `${new Intl.NumberFormat("en-US").format(row.reviewCount)} Google reviews`
              : "No review data"}
          </div>
        </div>
      ))}
    </div>
  );
}
