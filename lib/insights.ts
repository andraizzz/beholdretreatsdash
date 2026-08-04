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

const insightsSchema = z.object({
  takeaways: z.array(z.string()).length(3),
  recommendations: z.array(z.string()).length(3),
});

export type WeeklyInsights = z.infer<typeof insightsSchema>;

export function isInsightsConfigured() {
  return isGa4Configured();
}

async function fetchWeeklyInsights(): Promise<WeeklyInsights> {
  "use cache";
  cacheLife("dashboard");
  cacheTag("ga4");
  cacheTag("gsc");
  cacheTag("insights");

  const [week, sinceLaunch, gsc] = await Promise.all([
    getGa4Summary(7),
    getGa4SinceLaunch(),
    isGscConfigured() ? getGscSummary(7).catch(() => null) : Promise.resolve(null),
  ]);

  const prompt = `You are a marketing analyst preparing a weekly report for the CEO of Behold Retreats, a retreat company. Write exactly 3 takeaways and exactly 3 recommendations based ONLY on the data below. Do not invent numbers that aren't given.

Context:
- Key event (conversion) tracking was only fixed on ${KEY_EVENTS_FIXED_DATE}. Key event counts before that date are unreliable/undercounted. Do not draw conclusions from key event trends unless comparing dates on/after ${KEY_EVENTS_FIXED_DATE}.
- The company launched a new domain on ${DOMAIN_LAUNCH_DATE}.

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

Since the domain launch (${DOMAIN_LAUNCH_DATE} to today):
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
}
Write takeaways that identify what's actually notable (biggest movers, which channels are working vs underperforming, anything odd about the domain migration). Write recommendations that are concrete and actionable for improving traffic, applications, or SEO next week. Keep each bullet to one or two sentences, plain English, no jargon, no bullet symbols in the text itself.`;

  const { output } = await generateText({
    model: "anthropic/claude-sonnet-5",
    output: Output.object({ schema: insightsSchema }),
    prompt,
  });

  return output;
}

export const getWeeklyInsights = fetchWeeklyInsights;
