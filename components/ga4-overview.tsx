import {
  getGa4Summary,
  isGa4Configured,
  KEY_EVENTS_FIXED_DATE,
} from "@/lib/sources/ga4";
import { MetricCard } from "@/components/metric-card";
import { SectionTitle } from "@/components/placeholder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SessionsTrendChart } from "@/components/sessions-trend-chart";
import { connection } from "next/server";

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export async function Ga4Overview() {
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
    summary = await getGa4Summary(7);
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load GA4 data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const { totals, previousTotals, byChannel, trend } = summary;

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title="This week"
          subtitle="Last 7 days vs. the 7 days before that"
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
          title="Traffic by channel"
          subtitle="Which channels are driving sessions and key events this week"
        />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
                <TableHead className="text-right">Key events</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byChannel.map((row) => (
                <TableRow key={row.channel}>
                  <TableCell className="font-medium">{row.channel}</TableCell>
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
        <SectionTitle title="Daily trend" subtitle="Sessions and key events, last 7 days" />
        <SessionsTrendChart data={trend} />
      </section>
    </div>
  );
}
