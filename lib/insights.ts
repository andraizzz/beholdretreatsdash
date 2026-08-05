import { generateText, Output } from "ai";
import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import {
  getGa4Summary,
  getGa4SinceLaunch,
  isGa4Configured,
  DOMAIN_LAUNCH_DATE,
  KEY_EVENTS_FIXED_DATE,
} from "@/lib/sources/ga4";
import { getGscSummary, isGscConfigured } from "@/lib/sources/gsc";
import { getTypeformSources, isTypeformConfigured } from "@/lib/sources/typeform";

const insightsSchema = z.object({
  takeaways: z.array(z.string()).min(1).max(5),
  recommendations: z.array(z.string()).min(1).max(5),
});

export type WeeklyInsights = z.infer<typeof insightsSchema>;

export function isInsightsConfigured() {
  return isGa4Configured();
}

const REPORT_TIMEZONE = "Europe/Lisbon";

/**
 * Monday of the current week, as a wall-clock date in REPORT_TIMEZONE.
 * Not cached — call this outside any "use cache" scope (it reads the
 * clock) and pass the result in as an argument.
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const weekdayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
    get("weekday"),
  );

  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - weekdayIndex);
  return date.toISOString().slice(0, 10);
}

export function weekRangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}

async function fetchWeeklyInsights(weekStart: string): Promise<WeeklyInsights> {
  // "use cache" alone is per-instance in-memory on Vercel — with Fluid
  // Compute spinning up fresh instances for low-traffic routes, that meant
  // this was regenerating (and re-billing the AI Gateway call) on close to
  // every request instead of once a week. "remote" stores the entry in
  // Vercel's distributed Runtime Cache so it's actually shared.
  "use cache: remote";
  cacheLife("weekly");
  cacheTag("insights");

  const [week, sinceLaunch, gsc, typeform] = await Promise.all([
    getGa4Summary(7),
    getGa4SinceLaunch(),
    isGscConfigured() ? getGscSummary(7).catch(() => null) : Promise.resolve(null),
    isTypeformConfigured()
      ? getTypeformSources(7).catch(() => null)
      : Promise.resolve(null),
  ]);

  const prompt = `You are a marketing analyst preparing a weekly report for the CEO of Behold Retreats, a retreat company. This report covers the week of ${weekStart} (Monday) through the following Sunday. Write exactly 3 takeaways and exactly 3 recommendations based ONLY on the data below. Do not invent numbers that aren't given.

Context:
- Key event (conversion) tracking was only fixed on ${KEY_EVENTS_FIXED_DATE}. Key event counts before that date are unreliable/undercounted. Do not draw conclusions from key event trends unless comparing dates on/after ${KEY_EVENTS_FIXED_DATE}.
- The company launched a new domain on ${DOMAIN_LAUNCH_DATE}.
- All figures below cover complete days only (through yesterday) — today is deliberately excluded since it's still in progress and would look like a false drop.

This week (last 7 days) vs. the 7 days before:
- Sessions: ${week.totals.sessions} (previous: ${week.previousTotals.sessions})
- Users: ${week.totals.totalUsers} (previous: ${week.previousTotals.totalUsers})
- Engagement rate: ${(week.totals.engagementRate * 100).toFixed(1)}%
- Key events this week: ${week.totals.keyEvents} (caveat above applies)
- By channel this week: ${week.byChannel
    .map(
      (c) =>
        `${c.channel}: ${c.sessions} sessions, ${(c.engagementRate * 100).toFixed(0)}% engagement, ${c.keyEvents} key events`,
    )
    .join("; ")}

Since the domain launch (${DOMAIN_LAUNCH_DATE} through yesterday):
- Total sessions: ${sinceLaunch.totals.sessions}
- Total users: ${sinceLaunch.totals.totalUsers}
- By channel since launch: ${sinceLaunch.byChannel
    .map((c) => `${c.channel}: ${c.sessions} sessions, ${(c.engagementRate * 100).toFixed(0)}% engagement`)
    .join("; ")}
- Daily sessions trend since launch: ${sinceLaunch.trend
    .map((d) => `${d.date}: ${d.sessions}`)
    .join(", ")}
${
  gsc
    ? `
Search Console, last 7 days (site: ${gsc.siteUrl}):
- Clicks: ${gsc.totals.clicks}, Impressions: ${gsc.totals.impressions}, Avg CTR: ${(gsc.totals.ctr * 100).toFixed(1)}%, Avg position: ${gsc.totals.position.toFixed(1)}
- Top queries: ${gsc.topQueries
        .slice(0, 5)
        .map((q) => `"${q.query}" (${q.clicks} clicks, position ${q.position.toFixed(1)})`)
        .join("; ")}
- Top landing pages: ${gsc.topPages
        .slice(0, 5)
        .map((p) => `${p.page} (${p.clicks} clicks)`)
        .join("; ")}
`
    : ""
}${
  typeform
    ? `
Application form, last 7 days — what applicants SAY when asked "How did you hear about Behold Retreats?" (${typeform.total} applicants answered, vs ${typeform.previousTotal} the week before):
${typeform.rows
        .map(
          (r) =>
            `- ${r.label}: ${r.count} (${(r.share * 100).toFixed(0)}% of applicants, was ${r.previousCount} last week)`,
        )
        .join("\n")}

This self-reported data is a useful cross-check on GA4. GA4 measures what the browser reports; this measures what people say. Where the two disagree sharply, treat that as a signal worth calling out — a channel with lots of GA4 sessions but no applicants citing it may be misattributed traffic rather than real demand.
`
    : ""
}
Write takeaways that identify what's actually notable (biggest movers, which channels are working vs underperforming, anything odd about the domain migration, and any sharp disagreement between GA4 traffic and what applicants self-report). Write recommendations that are concrete and actionable for improving traffic, applications, or SEO next week. Keep each bullet to one or two sentences, plain English, no jargon, no bullet symbols in the text itself.`;

  // This result is cached for the whole calendar week (see cacheLife above),
  // so a single malformed generation would otherwise lock the week's
  // takeaways behind an error until someone manually busts the cache.
  // Retry a couple of times before giving up — errors aren't cached, only
  // successful returns are, so a later request would retry anyway; this
  // just avoids surfacing a transient failure to whoever loads the page.
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { output } = await generateText({
        model: "anthropic/claude-sonnet-5",
        output: Output.object({ schema: insightsSchema }),
        prompt,
      });
      return {
        takeaways: output.takeaways.slice(0, 3),
        recommendations: output.recommendations.slice(0, 3),
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

export const getWeeklyInsights = fetchWeeklyInsights;
