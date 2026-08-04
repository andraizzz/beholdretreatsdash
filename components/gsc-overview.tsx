import { getGscSummary, isGscConfigured } from "@/lib/sources/gsc";
import { MetricCard } from "@/components/metric-card";
import { SectionTitle, Placeholder } from "@/components/placeholder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { connection } from "next/server";

function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

export async function GscOverview() {
  await connection();

  if (!isGscConfigured()) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        Search Console isn&apos;t connected yet.
      </div>
    );
  }

  let summary;
  try {
    summary = await getGscSummary(7);
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load Search Console data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  const { totals, topQueries, topPages } = summary;

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle
          title="This week"
          subtitle="Last 7 days (Search Console data lags ~2 days)"
        />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <MetricCard label="Clicks" value={formatNumber(totals.clicks)} hint="GSC" />
          <MetricCard
            label="Impressions"
            value={formatNumber(totals.impressions)}
            hint="GSC"
          />
          <MetricCard
            label="Avg. CTR"
            value={`${(totals.ctr * 100).toFixed(1)}%`}
          />
          <MetricCard
            label="Avg. position"
            value={totals.position.toFixed(1)}
          />
        </div>
      </section>

      <section>
        <SectionTitle title="Top queries" subtitle="What people searched to find the site" />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Query</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Avg. position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topQueries.map((row) => (
                <TableRow key={row.query}>
                  <TableCell className="font-medium">{row.query}</TableCell>
                  <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.impressions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(row.ctr * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionTitle title="Top landing pages" />
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Impressions</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead className="text-right">Avg. position</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPages.map((row) => (
                <TableRow key={row.page}>
                  <TableCell className="font-medium max-w-xs truncate">
                    {row.page}
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(row.clicks)}</TableCell>
                  <TableCell className="text-right">
                    {formatNumber(row.impressions)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(row.ctr * 100).toFixed(1)}%
                  </TableCell>
                  <TableCell className="text-right">{row.position.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <SectionTitle
          title="Attributed applications"
          subtitle="Applications where SEO/organic search was cited or UTM'd — not wired up yet"
        />
        <Placeholder label="Attributed applications list (needs Typeform)" height={160} />
      </section>
    </div>
  );
}
