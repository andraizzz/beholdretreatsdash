import { NextResponse } from "next/server";
import { getGa4Summary, isGa4Configured } from "@/lib/sources/ga4";

export async function GET() {
  if (!isGa4Configured()) {
    return NextResponse.json(
      { error: "GA4 is not configured. Set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_KEY_BASE64." },
      { status: 400 },
    );
  }

  try {
    const summary = await getGa4Summary(7);
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
