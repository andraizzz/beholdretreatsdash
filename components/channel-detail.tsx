import { connection } from "next/server";
import {
  getGa4Channel,
  isGa4Configured,
  KEY_EVENTS_FIXED_DATE,
} from "@/lib/sources/ga4";
import { MetricCard } from "@/components/metric-card";
import { SectionTitle } from "@/components/placeholder";
import { SessionsTrendChart } from "@/components/sessions-trend-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

type Props = {
  /** GA4 default channel group names that make up this page. */
  channels: string[];
  sourceLabel: string;
  days?: number;
};

export async function ChannelDetail({ channels, sourceLabel, days = 7 }: Props) {
  await connection();

  if (!isGa4Configured()) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        GA4 isn&apos;t connected yet.
      </div>
    );
  }

  let detail;
  try {
    detail = await getGa4Channel(channels, days);
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load GA4 data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const { totals, previousTotals, topSources, topLandingPages, trend } = detail;

  if (totals.sessions === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        No {sourceLabel.toLowerCase()} traffic in the last {days} days. GA4 is
        connected — this channel simply had no sessions in this window.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title={days === 7 ? "This week" : `Last ${days} days`}
          subtitle={`Last ${days} days vs. the ${days} days before that — complete days only, today is excluded`}
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
            hint={`GA4 tracking unreliable — verify vs. Typeform (last fix attempt ${KEY_EVENTS_FIXED_DATE})`}
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Where it's coming from"
          subtitle={`Top sources sending ${sourceLabel.toLowerCase()} traffic, last ${days} days`}
        />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
                <TableHead className="text-right">Key events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topSources.map((row) => (
                <TableRow key={row.source}>
                  <TableCell className="font-medium">{row.source}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.sessions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.totalUsers)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(row.engagementRate * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.keyEvents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Where they land"
          subtitle="The first page people see when they arrive from this channel"
        />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Landing page</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Key events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topLandingPages.map((row) => (
                <TableRow key={row.page}>
                  <TableCell className="font-medium max-w-md truncate">
                    {row.page}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.sessions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.keyEvents)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionTitle title="Daily trend" subtitle={`Sessions, last ${days} days`} />
        <SessionsTrendChart data={trend} />
      </section>
    </div>
  );
}
