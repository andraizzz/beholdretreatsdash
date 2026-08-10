import {
  getCompetitorReputation,
  isPlacesConfigured,
  lookupPlaceText,
} from "@/lib/sources/places";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q");

  if (!isPlacesConfigured()) {
    return Response.json({ configured: false }, { status: 200 });
  }

  try {
    // ?q=<any text query> tests the Places API directly, bypassing the
    // cached COMPETITORS list — for figuring out the right query string
    // when a business doesn't resolve.
    if (q) {
      const apiKey = process.env.GOOGLE_PLACES_API_KEY!;
      const result = await lookupPlaceText(apiKey, q);
      return Response.json({ configured: true, query: q, result });
    }

    const rows = await getCompetitorReputation();
    return Response.json({ configured: true, rows });
  } catch (error) {
    return Response.json(
      {
        configured: true,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
