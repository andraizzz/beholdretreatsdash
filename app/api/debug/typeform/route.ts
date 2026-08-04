import { getTypeformSources, isTypeformConfigured } from "@/lib/sources/typeform";

export async function GET(request: Request) {
  // Read the request before anything else: without this the unconfigured
  // branch is prerenderable, and Next would bake "configured: false" into a
  // static response that never re-evaluates once the token is added.
  const days = Number(new URL(request.url).searchParams.get("days")) || 7;

  if (!isTypeformConfigured()) {
    return Response.json({ configured: false }, { status: 200 });
  }

  try {
    const summary = await getTypeformSources(days);
    return Response.json({ configured: true, days, ...summary });
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
