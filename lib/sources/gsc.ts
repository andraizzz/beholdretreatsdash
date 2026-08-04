import { JWT } from "google-auth-library";
import { cacheLife, cacheTag } from "next/cache";

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";

function getAuthClient() {
  const keyBase64 = process.env.GA4_SERVICE_ACCOUNT_KEY_BASE64;
  if (!keyBase64) return null;

  const credentials = JSON.parse(
    Buffer.from(keyBase64, "base64").toString("utf-8"),
  );

  return new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [SCOPE],
  });
}

export function isGscConfigured() {
  return Boolean(process.env.GA4_SERVICE_ACCOUNT_KEY_BASE64);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function normalizeSiteUrl(url: string) {
  return url
    .replace(/^sc-domain:/, "")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/-/g, "")
    .toLowerCase();
}

async function resolveSiteUrl(auth: JWT): Promise<string> {
  const configured = process.env.GSC_SITE_URL;
  if (configured) return configured;

  const res = await auth.request<{ siteEntry?: { siteUrl: string }[] }>({
    url: "https://www.googleapis.com/webmasters/v3/sites",
  });
  const sites = res.data.siteEntry ?? [];
  const match = sites.find(
    (s) => normalizeSiteUrl(s.siteUrl) === "beholdretreats.com",
  );
  if (!match) {
    throw new Error(
      `No Search Console property for beholdretreats.com found for this service account. Sites it can see: ${sites
        .map((s) => s.siteUrl)
        .join(", ") || "(none)"}`,
    );
  }
  return match.siteUrl;
}

export type QueryRow = {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type PageRow = {
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscSummary = {
  siteUrl: string;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: QueryRow[];
  topPages: PageRow[];
};

async function searchAnalyticsQuery(
  auth: JWT,
  siteUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[],
  rowLimit = 10,
) {
  const res = await auth.request<{
    rows?: {
      keys: string[];
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }[];
  }>({
    url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    method: "POST",
    data: { startDate, endDate, dimensions, rowLimit },
  });
  return res.data.rows ?? [];
}

async function fetchGscSummary(days: number): Promise<GscSummary> {
  "use cache";
  cacheLife("dashboard");
  cacheTag("gsc");

  const auth = getAuthClient();
  if (!auth) {
    throw new Error("GSC is not configured");
  }

  const siteUrl = await resolveSiteUrl(auth);

  const end = new Date();
  end.setDate(end.getDate() - 2); // GSC data has ~2 day lag
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const startDate = isoDate(start);
  const endDate = isoDate(end);

  const [totalsRows, queryRows, pageRows] = await Promise.all([
    searchAnalyticsQuery(auth, siteUrl, startDate, endDate, [], 1),
    searchAnalyticsQuery(auth, siteUrl, startDate, endDate, ["query"], 10),
    searchAnalyticsQuery(auth, siteUrl, startDate, endDate, ["page"], 10),
  ]);

  const totalsRow = totalsRows[0];
  const totals = {
    clicks: totalsRow?.clicks ?? 0,
    impressions: totalsRow?.impressions ?? 0,
    ctr: totalsRow?.ctr ?? 0,
    position: totalsRow?.position ?? 0,
  };

  const topQueries: QueryRow[] = queryRows.map((r) => ({
    query: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));

  const topPages: PageRow[] = pageRows.map((r) => ({
    page: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }));

  return { siteUrl, totals, topQueries, topPages };
}

export const getGscSummary = fetchGscSummary;
