import { NextResponse, connection } from "next/server";
import { getGscSummary, isGscConfigured } from "@/lib/sources/gsc";

export async function GET() {
  await connection();

  if (!isGscConfigured()) {
    return NextResponse.json(
      { error: "GSC is not configured." },
      { status: 400 },
    );
  }

  try {
    const summary = await getGscSummary(7);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
