import { getCompetitorReputation, isPlacesConfigured } from "@/lib/sources/places";

export async function GET(request: Request) {
  // Touch the request before the early return: without this the
  // unconfigured branch is prerenderable, and Next would bake
  // "configured: false" into a static response that never re-evaluates
  // once the key is added (same trap hit on the typeform debug route).
  void request.url;

  if (!isPlacesConfigured()) {
    return Response.json({ configured: false }, { status: 200 });
  }

  try {
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
