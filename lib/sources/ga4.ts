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

/**
 * "Today" in GA4 is always a partial day — most of this traffic is US-based,
 * so at most hours of the day the current day's session count looks like a
 * cliff-drop purely because the day hasn't finished yet. Every date range in
 * this file ends at yesterday, not today, so totals/trends/comparisons are
 * always full-day-to-full-day.
 */
function yesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

function dateRangeForLastNDays(days: number) {
  const end = yesterday();
  const start = new Date(end);
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
  previousByChannel: ChannelRow[];
  /** The single biggest traffic source feeding each channel group, by sessions. */
  topSourceByChannel: { channel: string; source: string; sessions: number }[];
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
  const prevEnd = new Date(current.startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  const previous = { startDate: isoDate(prevStart), endDate: isoDate(prevEnd) };

  const [
    totalsReport,
    channelReport,
    trendReport,
    previousTotalsReport,
    previousChannelReport,
    channelSourceReport,
  ] = await Promise.all([
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
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [previous],
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
        dimensions: [
          { name: "sessionDefaultChannelGroup" },
          { name: "sessionSource" },
        ],
        metrics: [{ name: "sessions" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 500,
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

  const previousByChannel: ChannelRow[] = (previousChannelReport[0].rows ?? []).map(
    (row) => ({
      channel: row.dimensionValues?.[0]?.value || "(unassigned)",
      sessions: num(row.metricValues?.[0]?.value),
      totalUsers: num(row.metricValues?.[1]?.value),
      engagementRate: num(row.metricValues?.[2]?.value),
      keyEvents: num(row.metricValues?.[3]?.value),
    }),
  );

  const trend = (trendReport[0].rows ?? []).map((row) => {
    const raw = row.dimensionValues?.[0]?.value || "";
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    return {
      date,
      sessions: num(row.metricValues?.[0]?.value),
      keyEvents: num(row.metricValues?.[1]?.value),
    };
  });

  // Rows are already sorted by sessions desc across all channel+source pairs,
  // so the first time we see a channel is its single biggest source.
  const topSourceByChannel: Ga4Summary["topSourceByChannel"] = [];
  const seenChannels = new Set<string>();
  for (const row of channelSourceReport[0].rows ?? []) {
    const channel = row.dimensionValues?.[0]?.value || "(unassigned)";
    if (seenChannels.has(channel)) continue;
    seenChannels.add(channel);
    topSourceByChannel.push({
      channel,
      source: row.dimensionValues?.[1]?.value || "(not set)",
      sessions: num(row.metricValues?.[0]?.value),
    });
  }

  return {
    totals,
    previousTotals,
    byChannel,
    previousByChannel,
    topSourceByChannel,
    trend,
  };
}

export const getGa4Summary = fetchGa4Summary;

export const DOMAIN_LAUNCH_DATE = "2026-07-14";
export const KEY_EVENTS_FIXED_DATE = "2026-08-04";

/** The site's own domains — a "top source" matching one of these is a self-referral, not real inbound traffic. */
export const SITE_DOMAINS = ["beholdretreats.com", "behold-retreats.com"];

export type SourceRow = {
  source: string;
  sessions: number;
  totalUsers: number;
  engagementRate: number;
  keyEvents: number;
};

export type LandingPageRow = {
  page: string;
  sessions: number;
  keyEvents: number;
};

export type Ga4ChannelDetail = {
  totals: {
    sessions: number;
    totalUsers: number;
    engagementRate: number;
    keyEvents: number;
  };
  previousTotals: {
    sessions: number;
    totalUsers: number;
    keyEvents: number;
  };
  topSources: SourceRow[];
  topLandingPages: LandingPageRow[];
  trend: { date: string; sessions: number; keyEvents: number }[];
};

/**
 * Traffic for one slice of the marketing pie. `channels` holds GA4 default
 * channel group names (e.g. ["Organic Social", "Paid Social"]) so a page can
 * combine related groups under one heading.
 */
async function fetchGa4Channel(
  channels: string[],
  days: number,
): Promise<Ga4ChannelDetail> {
  "use cache";
  cacheLife("dashboard");
  cacheTag("ga4");

  const conn = getClient();
  if (!conn) {
    throw new Error("GA4 is not configured");
  }
  const { client, propertyId } = conn;

  const current = dateRangeForLastNDays(days);
  const prevEnd = new Date(current.startDate);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  const previous = { startDate: isoDate(prevStart), endDate: isoDate(prevEnd) };

  const dimensionFilter = {
    filter: {
      fieldName: "sessionDefaultChannelGroup",
      inListFilter: { values: channels },
    },
  };

  const num = (v: string | null | undefined) => Number(v ?? 0);

  const [totalsReport, prevTotalsReport, sourcesReport, pagesReport, trendReport] =
    await Promise.all([
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [current],
        dimensionFilter,
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagementRate" },
          { name: "keyEvents" },
        ],
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [previous],
        dimensionFilter,
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "keyEvents" },
        ],
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [current],
        dimensionFilter,
        dimensions: [{ name: "sessionSource" }],
        metrics: [
          { name: "sessions" },
          { name: "totalUsers" },
          { name: "engagementRate" },
          { name: "keyEvents" },
        ],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 15,
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [current],
        dimensionFilter,
        dimensions: [{ name: "landingPagePlusQueryString" }],
        metrics: [{ name: "sessions" }, { name: "keyEvents" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        // Over-fetch: click-ID variants collapse into far fewer distinct paths.
        limit: 100,
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [current],
        dimensionFilter,
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }, { name: "keyEvents" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
    ]);

  const totalsRow = totalsReport[0].rows?.[0];
  const totals = {
    sessions: num(totalsRow?.metricValues?.[0]?.value),
    totalUsers: num(totalsRow?.metricValues?.[1]?.value),
    engagementRate: num(totalsRow?.metricValues?.[2]?.value),
    keyEvents: num(totalsRow?.metricValues?.[3]?.value),
  };

  const prevRow = prevTotalsReport[0].rows?.[0];
  const previousTotals = {
    sessions: num(prevRow?.metricValues?.[0]?.value),
    totalUsers: num(prevRow?.metricValues?.[1]?.value),
    keyEvents: num(prevRow?.metricValues?.[2]?.value),
  };

  const topSources: SourceRow[] = (sourcesReport[0].rows ?? []).map((row) => ({
    source: row.dimensionValues?.[0]?.value || "(not set)",
    sessions: num(row.metricValues?.[0]?.value),
    totalUsers: num(row.metricValues?.[1]?.value),
    engagementRate: num(row.metricValues?.[2]?.value),
    keyEvents: num(row.metricValues?.[3]?.value),
  }));

  // Ad platforms append click IDs (fbclid, gclid, ...) to the landing URL, so
  // the same page shows up as a dozen near-identical rows. Collapse on path.
  const pagesByPath = new Map<string, LandingPageRow>();
  for (const row of pagesReport[0].rows ?? []) {
    const raw = row.dimensionValues?.[0]?.value || "(not set)";
    const page = raw.split("?")[0] || raw;
    const existing = pagesByPath.get(page);
    const sessions = num(row.metricValues?.[0]?.value);
    const keyEvents = num(row.metricValues?.[1]?.value);
    if (existing) {
      existing.sessions += sessions;
      existing.keyEvents += keyEvents;
    } else {
      pagesByPath.set(page, { page, sessions, keyEvents });
    }
  }
  const topLandingPages: LandingPageRow[] = [...pagesByPath.values()]
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const trend = (trendReport[0].rows ?? []).map((row) => {
    const raw = row.dimensionValues?.[0]?.value || "";
    return {
      date: `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`,
      sessions: num(row.metricValues?.[0]?.value),
      keyEvents: num(row.metricValues?.[1]?.value),
    };
  });

  return { totals, previousTotals, topSources, topLandingPages, trend };
}

export const getGa4Channel = fetchGa4Channel;

export type Ga4RangeSummary = {
  totals: {
    sessions: number;
    totalUsers: number;
    activeUsers: number;
    engagementRate: number;
    keyEvents: number;
  };
  byChannel: ChannelRow[];
  trend: { date: string; sessions: number; keyEvents: number }[];
};

async function fetchGa4SinceDate(startDate: string): Promise<Ga4RangeSummary> {
  "use cache";
  cacheLife("dashboard");
  cacheTag("ga4");

  const conn = getClient();
  if (!conn) {
    throw new Error("GA4 is not configured");
  }
  const { client, propertyId } = conn;

  const range = { startDate, endDate: isoDate(yesterday()) };
  const num = (v: string | null | undefined) => Number(v ?? 0);

  const [totalsReport, channelReport, trendReport] = await Promise.all([
    client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [range],
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
      dateRanges: [range],
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
      dateRanges: [range],
      dimensions: [{ name: "date" }],
      metrics: [{ name: "sessions" }, { name: "keyEvents" }],
      orderBys: [{ dimension: { dimensionName: "date" } }],
    }),
  ]);

  const totalsRow = totalsReport[0].rows?.[0];
  const totals = {
    sessions: num(totalsRow?.metricValues?.[0]?.value),
    totalUsers: num(totalsRow?.metricValues?.[1]?.value),
    activeUsers: num(totalsRow?.metricValues?.[2]?.value),
    engagementRate: num(totalsRow?.metricValues?.[3]?.value),
    keyEvents: num(totalsRow?.metricValues?.[4]?.value),
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

  return { totals, byChannel, trend };
}

export const getGa4SinceLaunch = () => fetchGa4SinceDate(DOMAIN_LAUNCH_DATE);

export type Ga4RollingSummary = {
  /** ISO date strings of each week's start (Monday-of-that-window), index 0 = most recent. */
  weekStarts: string[];
  /** Sessions per week, aligned to weekStarts (index 0 = current). */
  sessionsByWeek: number[];
  /** Key events per week, aligned to weekStarts. */
  keyEventsByWeek: number[];
  /** Per-channel sessions across the same weeks. */
  perChannel: {
    channel: string;
    sessionsByWeek: number[];
    keyEventsByWeek: number[];
  }[];
};

/**
 * Multi-week rolling data: gives 5 (or N) consecutive 7-day windows ending
 * yesterday, so the CEO strip can compare "this week" against the average
 * of the prior 4 weeks. Single GA4 call (date × channel), bucketed in JS.
 */
async function fetchGa4Rolling(weeks: number): Promise<Ga4RollingSummary> {
  "use cache";
  cacheLife("dashboard");
  cacheTag("ga4");

  const conn = getClient();
  if (!conn) {
    throw new Error("GA4 is not configured");
  }
  const { client, propertyId } = conn;

  const totalDays = weeks * 7;
  const range = dateRangeForLastNDays(totalDays);

  const report = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [range],
    dimensions: [
      { name: "date" },
      { name: "sessionDefaultChannelGroup" },
    ],
    metrics: [{ name: "sessions" }, { name: "keyEvents" }],
  });

  const num = (v: string | null | undefined) => Number(v ?? 0);
  const endDate = new Date(`${range.endDate}T00:00:00Z`);

  const sessionsByWeek = new Array(weeks).fill(0);
  const keyEventsByWeek = new Array(weeks).fill(0);
  const perChannelMap = new Map<
    string,
    { sessions: number[]; keyEvents: number[] }
  >();

  for (const row of report[0].rows ?? []) {
    const raw = row.dimensionValues?.[0]?.value || "";
    const date = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    const channel = row.dimensionValues?.[1]?.value || "(unassigned)";
    const sessions = num(row.metricValues?.[0]?.value);
    const keyEvents = num(row.metricValues?.[1]?.value);

    const d = new Date(`${date}T00:00:00Z`);
    const daysAgo = Math.floor((endDate.getTime() - d.getTime()) / 86400000);
    const weekIdx = Math.floor(daysAgo / 7);
    if (weekIdx < 0 || weekIdx >= weeks) continue;

    sessionsByWeek[weekIdx] += sessions;
    keyEventsByWeek[weekIdx] += keyEvents;

    if (!perChannelMap.has(channel)) {
      perChannelMap.set(channel, {
        sessions: new Array(weeks).fill(0),
        keyEvents: new Array(weeks).fill(0),
      });
    }
    const entry = perChannelMap.get(channel)!;
    entry.sessions[weekIdx] += sessions;
    entry.keyEvents[weekIdx] += keyEvents;
  }

  const weekStarts: string[] = [];
  for (let i = 0; i < weeks; i++) {
    const d = new Date(endDate);
    d.setUTCDate(d.getUTCDate() - i * 7 - 6);
    weekStarts.push(isoDate(d));
  }

  const perChannel = [...perChannelMap.entries()]
    .map(([channel, data]) => ({
      channel,
      sessionsByWeek: data.sessions,
      keyEventsByWeek: data.keyEvents,
    }))
    // Sort by current-week volume so the biggest channels come first
    .sort((a, b) => b.sessionsByWeek[0] - a.sessionsByWeek[0]);

  return { weekStarts, sessionsByWeek, keyEventsByWeek, perChannel };
}

export const getGa4Rolling = fetchGa4Rolling;
