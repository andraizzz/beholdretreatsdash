import {
  getGa4SinceLaunch,
  isGa4Configured,
  DOMAIN_LAUNCH_DATE,
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

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function daysAgo(dateStr: string) {
  const ms = Date.now() - new Date(dateStr).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24)) - 1;
}

export async function Ga4SinceLaunch() {
  if (!isGa4Configured()) return null;
  await connection();

  let summary;
  try {
    summary = await getGa4SinceLaunch();
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load GA4 data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const { totals, byChannel, trend } = summary;

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title="Since the new domain launched"
          subtitle={`${DOMAIN_LAUNCH_DATE} → yesterday (${daysAgo(DOMAIN_LAUNCH_DATE)} full days — today is excluded while it's still in progress)`}
        />
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          GA4 key event tracking has been broken repeatedly. Latest fix
          attempt was {KEY_EVENTS_FIXED_DATE}, not yet verified working —
          the &ldquo;Key events&rdquo; number here is GA4&apos;s count and
          shouldn&apos;t be trusted until it roughly matches Typeform
          applications. Typeform is the trusted source for how many people
          actually applied.
        </div>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <MetricCard label="Sessions" value={formatNumber(totals.sessions)} />
          <MetricCard label="Users" value={formatNumber(totals.totalUsers)} />
          <MetricCard
            label="Engagement rate"
            value={`${(totals.engagementRate * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Key events"
            value={formatNumber(totals.keyEvents)}
            hint="unreliable before Aug 4"
          />
        </div>
      </section>

      <section>
        <SectionTitle
          title="Traffic by channel since launch"
          subtitle="Which channels have driven traffic since the domain move"
        />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Channel</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Engagement</TableHead>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionTitle title="Daily sessions since launch" />
        <SessionsTrendChart data={trend} />
      </section>
    </div>
  );
}
