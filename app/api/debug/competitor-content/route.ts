import { getCompetitorContentPulse } from "@/lib/sources/competitor-content";

export async function GET(request: Request) {
  void request.url;

  try {
    const rows = await getCompetitorContentPulse();
    return Response.json({ rows });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
