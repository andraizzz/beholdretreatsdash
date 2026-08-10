"use server";

import { updateTag } from "next/cache";

// Deliberately does NOT touch "insights" — that's the AI-generated section,
// locked to one generation per calendar week so Refresh never costs money.
export async function refreshGa4() {
  updateTag("ga4");
  updateTag("gsc");
  updateTag("typeform");
  updateTag("trends");
  updateTag("places");
}
