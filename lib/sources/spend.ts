import { Redis } from "@upstash/redis";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Manual weekly spend entry. Two categories only for now: Bing Ads
 * (Microsoft Advertising) and Costa Rica News sponsored content. Stored per
 * ISO-week Monday in Upstash Redis so historical weeks stay editable and
 * the 4-week rolling average has real data behind it.
 *
 * Provisioned via the Vercel Marketplace (Upstash Redis integration) —
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set automatically
 * by that integration.
 */

export type WeeklySpend = {
  bing: number;
  crNews: number;
};

export type WeeklySpendEntry = WeeklySpend & {
  weekStart: string; // ISO date, Monday
  total: number;
};

export function isSpendConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getClient(): Redis | null {
  if (!isSpendConfigured()) return null;
  return Redis.fromEnv();
}

function spendKey(weekStart: string) {
  return `spend:${weekStart}`;
}

/** ISO date of the Monday of the week containing `date`, UTC. */
export function isoWeekStart(date: Date): string {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
  const offset = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

async function fetchWeekSpend(weekStart: string): Promise<WeeklySpend> {
  const client = getClient();
  if (!client) return { bing: 0, crNews: 0 };
  const raw = await client.get<WeeklySpend>(spendKey(weekStart));
  return { bing: raw?.bing ?? 0, crNews: raw?.crNews ?? 0 };
}

async function fetchSpendHistory(weeks: number): Promise<WeeklySpendEntry[]> {
  "use cache: remote";
  cacheLife("dashboard");
  cacheTag("spend");

  const client = getClient();
  if (!client) return [];

  const today = new Date();
  const currentWeekStart = isoWeekStart(today);
  const cursor = new Date(`${currentWeekStart}T00:00:00Z`);

  const weekStarts: string[] = [];
  for (let i = 0; i < weeks; i++) {
    weekStarts.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 7);
  }

  const raws = await Promise.all(
    weekStarts.map((w) => client.get<WeeklySpend>(spendKey(w))),
  );
  return weekStarts.map((weekStart, i) => {
    const bing = raws[i]?.bing ?? 0;
    const crNews = raws[i]?.crNews ?? 0;
    return { weekStart, bing, crNews, total: bing + crNews };
  });
}

export const getSpendHistory = fetchSpendHistory;
export const getWeekSpend = fetchWeekSpend;

/** Server-action-only. Writes weekly spend and returns the new entry. */
export async function writeWeekSpend(
  weekStart: string,
  spend: WeeklySpend,
): Promise<WeeklySpendEntry> {
  const client = getClient();
  if (!client) throw new Error("Spend storage is not configured");
  const clean: WeeklySpend = {
    bing: Math.max(0, Number(spend.bing) || 0),
    crNews: Math.max(0, Number(spend.crNews) || 0),
  };
  await client.set(spendKey(weekStart), clean);
  return { weekStart, ...clean, total: clean.bing + clean.crNews };
}
