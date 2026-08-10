import { connection } from "next/server";
import {
  isSpendConfigured,
  isoWeekStart,
  getWeekSpend,
} from "@/lib/sources/spend";
import { SpendInput } from "@/components/spend-input";

export async function SpendSection() {
  await connection();

  if (!isSpendConfigured()) {
    return (
      <div className="rounded-md border border-dashed p-4 text-xs text-muted-foreground">
        Weekly ad-spend entry isn&apos;t set up yet. Provision Upstash Redis via
        Vercel dashboard → Storage → Create Database → Marketplace → Upstash
        Redis. Once connected, this section becomes a form for Bing + Costa
        Rica News weekly spend, and the Cost-per-application tile above lights
        up.
      </div>
    );
  }

  const weekStart = isoWeekStart(new Date());
  const existing = await getWeekSpend(weekStart).catch(() => ({
    bing: 0,
    crNews: 0,
  }));

  return <SpendInput initial={{ ...existing, weekStart }} />;
}
