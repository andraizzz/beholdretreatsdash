import {
  getAiSearchVisibility,
  isAiSearchConfigured,
} from "@/lib/sources/ai-search";

export async function GET(request: Request) {
  // Read the request before the early return so the unconfigured branch
  // isn't baked into a static shell that outlives adding the keys.
  void request.url;

  if (!isAiSearchConfigured()) {
    return Response.json({ configured: false }, { status: 200 });
  }

  try {
    const summary = await getAiSearchVisibility();
    return Response.json({ configured: true, ...summary });
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
