import {
  getGa4Summary,
  getGa4Rolling,
  isGa4Configured,
  KEY_EVENTS_FIXED_DATE,
  SITE_DOMAINS,
} from "@/lib/sources/ga4";
import { MetricCard } from "@/components/metric-card";
import { SectionTitle } from "@/components/placeholder";
import { ChannelBreakdown, type ChannelBreakdownRow } from "@/components/channel-breakdown";
import { SessionsTrendChart } from "@/components/sessions-trend-chart";
import { connection } from "next/server";

const ROLLING_WEEKS = 5;

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export async function Ga4Overview({ days = 7 }: { days?: number }) {
  await connection();

  if (!isGa4Configured()) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        GA4 isn&apos;t connected yet. Set <code>GA4_PROPERTY_ID</code> and{" "}
        <code>GA4_SERVICE_ACCOUNT_KEY_BASE64</code> to see live traffic here.
      </div>
    );
  }

  const isWeekly = days === 7;

  let summary;
  let rolling;
  try {
    [summary, rolling] = await Promise.all([
      getGa4Summary(days),
      isWeekly ? getGa4Rolling(ROLLING_WEEKS) : Promise.resolve(null),
    ]);
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load GA4 data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const { totals, previousTotals, byChannel, previousByChannel, topSourceByChannel, trend } =
    summary;

  // Weekly view: prefer 4-week rolling baseline (smooths noise at low
  // volume). Wider windows: fall back to prior-window comparison.
  const sessionsBaseline = rolling
    ? avg(rolling.sessionsByWeek.slice(1))
    : previousTotals.sessions;
  const usersBaseline = previousTotals.totalUsers; // no per-week user rollup yet
  const comparisonLabel = isWeekly
    ? "vs. 4-week average"
    : `vs. the ${days} days before that`;

  const previousByChannelMap = new Map(
    previousByChannel.map((c) => [c.channel, c]),
  );
  const rollingByChannelMap = new Map(
    (rolling?.perChannel ?? []).map((c) => [c.channel, c]),
  );
  const topSourceMap = new Map(topSourceByChannel.map((s) => [s.channel, s]));
  const totalSessions = byChannel.reduce((sum, c) => sum + c.sessions, 0);

  const channelRows: ChannelBreakdownRow[] = byChannel.map((c) => {
    const prev = previousByChannelMap.get(c.channel);
    const roll = rollingByChannelMap.get(c.channel);
    const top = topSourceMap.get(c.channel);

    // Same rule: use rolling baseline weekly, prior-window otherwise.
    let previousSessions: number | null = null;
    let deltaPct: number | null = null;
    if (isWeekly && roll) {
      const baseline = avg(roll.sessionsByWeek.slice(1));
      previousSessions = Math.round(baseline);
      deltaPct = baseline > 0 ? pctDelta(c.sessions, baseline) : null;
    } else if (prev) {
      previousSessions = prev.sessions;
      deltaPct = pctDelta(c.sessions, prev.sessions);
    }

    return {
      channel: c.channel,
      sessions: c.sessions,
      previousSessions,
      share: totalSessions > 0 ? c.sessions / totalSessions : 0,
      deltaPct,
      engagementRate: c.engagementRate,
      keyEvents: c.keyEvents,
      topSource:
        top && top.source !== "(direct)" && top.source !== "(not set)"
          ? {
              source: top.source,
              sessions: top.sessions,
              isSelfReferral: SITE_DOMAINS.some((d) => top.source.includes(d)),
            }
          : null,
    };
  });

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title={isWeekly ? "This week" : `Last ${days} days`}
          subtitle={
            isWeekly
              ? "Compared to a 4-week rolling average — smooths noise at low volume"
              : `Last ${days} days vs. the ${days} days before that`
          }
        />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <MetricCard
            label="Sessions"
            value={formatNumber(totals.sessions)}
            delta={{ value: pctDelta(totals.sessions, sessionsBaseline) }}
          />
          <MetricCard
            label="Users"
            value={formatNumber(totals.totalUsers)}
            delta={{
              value: pctDelta(totals.totalUsers, usersBaseline),
            }}
          />
          <MetricCard
            label="Engagement rate"
            value={`${(totals.engagementRate * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Key events"
            value={formatNumber(totals.keyEvents)}
            hint={`GA4 tracking unreliable — verify vs. Typeform (last fix attempt ${KEY_EVENTS_FIXED_DATE})`}
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title="The marketing pie — what's working, channel by channel"
          subtitle={`Share of traffic per channel, ${comparisonLabel}`}
        />
        <div className="rounded-md border p-4">
          <ChannelBreakdown rows={channelRows} />
        </div>
      </section>

      <section>
        <SectionTitle title="Daily trend" subtitle={`Sessions and key events, last ${days} days`} />
        <SessionsTrendChart data={trend} />
      </section>
    </div>
  );
}
