import { BetaAnalyticsDataClient } from "@google-analytics/data";
import { cacheLife, cacheTag } from "next/cache";

function getClient() {
  const propertyId = process.env.GA4_PROPERTY_ID;
  const keyBase64 = process.env.GA4_SERVICE_ACCOUNT_KEY_BASE64;

  if (!propertyId || !keyBase64) {
    return null;
  }

  const credentials = JSON.parse(
    Buffer.from(keyBase64, "base64").toString("utf-8"),
  );

  const client = new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });

  return { client, propertyId };
}

export function isGa4Configured() {
  return Boolean(
    process.env.GA4_PROPERTY_ID && process.env.GA4_SERVICE_ACCOUNT_KEY_BASE64,
  );
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function dateRangeForLastNDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

export type ChannelRow = {
  channel: string;
  sessions: number;
  totalUsers: number;
  engagementRate: number;
  keyEvents: number;
};

export type Ga4Summary = {
  totals: {
    sessions: number;
    totalUsers: number;
    activeUsers: number;
    engagementRate: number;
    keyEvents: number;
  };
  previousTotals: {
    sessions: number;
    totalUsers: number;
    keyEvents: number;
  };
  byChannel: ChannelRow[];
  trend: { date: string; sessions: number; keyEvents: number }[];
};

async function fetchGa4Summary(days: number): Promise<Ga4Summary> {
  "use cache";
  cacheLife("dashboard");
  cacheTag("ga4");

  const conn = getClient();
  if (!conn) {
    throw new Error("GA4 is not configured");
  }
  const { client, propertyId } = conn;

  const current = dateRangeForLastNDays(days);
  const prevEnd = new Date();
  prevEnd.setDate(prevEnd.getDate() - days);
  const prevStart = new Date();
  prevStart.setDate(prevStart.getDate() - days * 2 + 1);
  const previous = { startDate: isoDate(prevStart), endDate: isoDate(prevEnd) };

  const [totalsReport, channelReport, trendReport, previousTotalsReport] =
    await Promise.all([
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [current],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "activeUsers" },
          { name: "engagementRate" },
          { name: "keyEvents" },
        ],
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [current],
        dimensions: [{ name: "sessionDefaultChannelGroup" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagementRate" },
          { name: "keyEvents" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [current],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "keyEvents" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [previous],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "keyEvents" },
        ],
      }),
    ]);

  const totalsRow = totalsReport[0].rows?.[0];
  const num = (v: string | null | undefined) => Number(v ?? 0);

  const totals = {
    sessions: num(totalsRow?.metricValues?.[0]?.value),
    totalUsers: num(totalsRow?.metricValues?.[1]?.value),
    activeUsers: num(totalsRow?.metricValues?.[2]?.value),
    engagementRate: num(totalsRow?.metricValues?.[3]?.value),
    keyEvents: num(totalsRow?.metricValues?.[4]?.value),
  };

  const prevRow = previousTotalsReport[0].rows?.[0];
  const previousTotals = {
    sessions: num(prevRow?.metricValues?.[0]?.value),
    totalUsers: num(prevRow?.metricValues?.[1]?.value),
    keyEvents: num(prevRow?.metricValues?.[2]?.value),
  };

  const byChannel: ChannelRow[] = (channelReport[0].rows ?? []).map((row) => ({
    channel: row.dimensionValues?.[0]?.value || "(unassigned)",
    sessions: num(row.metricValues?.[0]?.value),
    totalUsers: num(row.metricValues?.[1]?.value),
    engagementRate: num(row.metricValues?.[2]?.value),
    keyEvents: num(row.metricValues?.[3]?.value),
  }));

  const trend = (trendReport[0].rows ?? []).map((row) => {
    const raw = row.dimensionValues?.[0]?.value || "";
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    return {
      date,
      sessions: num(row.metricValues?.[0]?.value),
      keyEvents: num(row.metricValues?.[1]?.value),
    };
  });

  return { totals, previousTotals, byChannel, trend };
}

export const getGa4Summary = fetchGa4Summary;
