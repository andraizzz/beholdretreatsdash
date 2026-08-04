import {
  getGa4Summary,
  isGa4Configured,
  KEY_EVENTS_FIXED_DATE,
} from "@/lib/sources/ga4";
import { MetricCard } from "@/components/metric-card";
import { SectionTitle } from "@/components/placeholder";
import { ChannelBreakdown, type ChannelBreakdownRow } from "@/components/channel-breakdown";
import { SessionsTrendChart } from "@/components/sessions-trend-chart";
import { connection } from "next/server";

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
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

  let summary;
  try {
    summary = await getGa4Summary(days);
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load GA4 data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const { totals, previousTotals, byChannel, previousByChannel, trend } = summary;

  const previousByChannelMap = new Map(
    previousByChannel.map((c) => [c.channel, c]),
  );
  const totalSessions = byChannel.reduce((sum, c) => sum + c.sessions, 0);
  const channelRows: ChannelBreakdownRow[] = byChannel.map((c) => {
    const prev = previousByChannelMap.get(c.channel);
    return {
      channel: c.channel,
      sessions: c.sessions,
      previousSessions: prev ? prev.sessions : null,
      share: totalSessions > 0 ? c.sessions / totalSessions : 0,
      deltaPct: prev ? pctDelta(c.sessions, prev.sessions) : null,
      engagementRate: c.engagementRate,
      keyEvents: c.keyEvents,
    };
  });

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title={days === 7 ? "This week" : `Last ${days} days`}
          subtitle={`Last ${days} days vs. the ${days} days before that`}
        />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <MetricCard
            label="Sessions"
            value={formatNumber(totals.sessions)}
            delta={{ value: pctDelta(totals.sessions, previousTotals.sessions) }}
          />
          <MetricCard
            label="Users"
            value={formatNumber(totals.totalUsers)}
            delta={{
              value: pctDelta(totals.totalUsers, previousTotals.totalUsers),
            }}
          />
          <MetricCard
            label="Engagement rate"
            value={`${(totals.engagementRate * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Key events"
            value={formatNumber(totals.keyEvents)}
            hint={`tracking fixed ${KEY_EVENTS_FIXED_DATE} — no WoW yet`}
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title="The marketing pie — what's working, channel by channel"
          subtitle={`Share of traffic and week-over-week trend per channel, last ${days} days vs. the ${days} before`}
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
