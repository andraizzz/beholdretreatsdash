"use server";

import { updateTag } from "next/cache";
import {
  writeWeekSpend,
  isoWeekStart,
  isSpendConfigured,
  type WeeklySpend,
} from "@/lib/sources/spend";

// Deliberately does NOT touch "insights" — that's the AI-generated section,
// locked to one generation per calendar week so Refresh never costs money.
export async function refreshGa4() {
  updateTag("ga4");
  updateTag("gsc");
  updateTag("typeform");
  updateTag("places");
}

export async function saveThisWeekSpend(spend: WeeklySpend) {
  if (!isSpendConfigured()) {
    throw new Error("Spend storage isn't provisioned yet");
  }
  const weekStart = isoWeekStart(new Date());
  await writeWeekSpend(weekStart, spend);
  updateTag("spend");
}
