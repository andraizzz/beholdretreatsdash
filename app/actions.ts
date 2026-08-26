"use server";

import { updateTag } from "next/cache";

/**
 * Refresh busts ONLY the free, fast, daily-changing sources. Everything
 * that costs money or is weekly by nature is deliberately excluded, so a
 * CEO clicking Refresh repeatedly during a meeting can never run up a bill:
 *
 *   - "insights"           AI-generated, one Sonnet call per calendar week
 *   - "ai-search"          ~$0.30 per generation on Perplexity
 *   - "competitor-content" one Sonnet call, plus fetches four external blogs
 *   - "places"             6 Google Places calls; review counts move slowly
 *                          enough that weekly is the right cadence, and
 *                          repeated clicks would eat the free allowance
 *
 * All four regenerate on their own weekly schedule. To force one early,
 * bust its tag deliberately rather than widening this action.
 */
export async function refreshGa4() {
  updateTag("ga4");
  updateTag("gsc");
  updateTag("typeform");
}
