import { cacheLife, cacheTag } from "next/cache";

/**
 * Google Trends has no official public API. This talks to the same
 * undocumented endpoints Trends' own website uses (the widget-token flow),
 * which is the standard approach every free "compare search interest" tool
 * relies on. It can break if Google changes those endpoints — callers
 * should treat failures as expected and degrade gracefully, not surface a
 * hard error.
 */

export const TRENDS_TERMS = ["Behold Retreats", "Soltara", "Rythmia"] as const;

export type TrendPoint = {
  date: string;
  values: number[]; // aligned to TRENDS_TERMS order, 0-100 relative interest
};

type ExploreWidget = {
  id?: string;
  token?: string;
  request?: unknown;
};

type ExploreResponse = {
  widgets?: ExploreWidget[];
};

type TimelineDataPoint = {
  formattedAxisTime?: string;
  formattedTime?: string;
  value?: number[];
};

type WidgetDataResponse = {
  default?: {
    timelineData?: TimelineDataPoint[];
  };
};

async function stripAndParse<T>(res: Response, trimChars: number): Promise<T> {
  const text = await res.text();
  return JSON.parse(text.slice(trimChars)) as T;
}

async function fetchTrends(): Promise<TrendPoint[]> {
  "use cache: remote";
  cacheLife("weekly");
  cacheTag("trends");

  const reqPayload = {
    comparisonItem: TRENDS_TERMS.map((keyword) => ({
      keyword,
      time: "today 3-m",
      geo: "US",
    })),
    category: 0,
    property: "",
  };

  const exploreUrl = new URL("https://trends.google.com/trends/api/explore");
  exploreUrl.searchParams.set("hl", "en-US");
  exploreUrl.searchParams.set("tz", "0");
  exploreUrl.searchParams.set("req", JSON.stringify(reqPayload));

  const exploreRes = await fetch(exploreUrl, {
    method: "POST",
    headers: { "accept-language": "en-US" },
  });
  if (!exploreRes.ok) {
    throw new Error(`Google Trends explore returned ${exploreRes.status}`);
  }
  const exploreJson = await stripAndParse<ExploreResponse>(exploreRes, 4);
  const widget = exploreJson.widgets?.find((w) => w.id === "TIMESERIES");
  if (!widget?.token || !widget.request) {
    throw new Error("Google Trends: no TIMESERIES widget in response");
  }

  const dataUrl = new URL(
    "https://trends.google.com/trends/api/widgetdata/multiline",
  );
  dataUrl.searchParams.set("req", JSON.stringify(widget.request));
  dataUrl.searchParams.set("token", widget.token);
  dataUrl.searchParams.set("tz", "0");

  const dataRes = await fetch(dataUrl);
  if (!dataRes.ok) {
    throw new Error(`Google Trends widgetdata returned ${dataRes.status}`);
  }
  const dataJson = await stripAndParse<WidgetDataResponse>(dataRes, 5);

  const timeline = dataJson.default?.timelineData ?? [];
  return timeline.map((point) => ({
    date: point.formattedAxisTime ?? point.formattedTime ?? "",
    values: point.value ?? [],
  }));
}

export const getTrends = fetchTrends;
