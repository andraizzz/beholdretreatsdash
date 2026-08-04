import { cacheLife, cacheTag } from "next/cache";

/** The application form ("How did you hear about Behold Retreats?" is Q11). */
export const TYPEFORM_FORM_ID = "HJl8bGwU";

/** Field ID of the "How did you hear about Behold Retreats?" question. */
const HEARD_ABOUT_FIELD_ID = "qu7C8BjJvp2F";

export function isTypeformConfigured() {
  return Boolean(process.env.TYPEFORM_TOKEN);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Same convention as the GA4 layer: windows end at yesterday, never today,
 * so a part-finished day can't read as a drop.
 */
function yesterday(): Date {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

function windowForLastNDays(days: number) {
  const end = yesterday();
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  return {
    since: `${isoDate(start)}T00:00:00Z`,
    until: `${isoDate(end)}T23:59:59Z`,
  };
}

export type ApplicationSourceRow = {
  label: string;
  count: number;
  previousCount: number;
  share: number;
  deltaPct: number | null;
};

export type TypeformSourceSummary = {
  total: number;
  previousTotal: number;
  rows: ApplicationSourceRow[];
};

type TypeformAnswer = {
  field?: { id?: string };
  choice?: { label?: string; other?: string };
};

type TypeformResponse = {
  answers?: TypeformAnswer[] | null;
};

async function fetchResponseCounts(
  since: string,
  until: string,
): Promise<Map<string, number>> {
  const token = process.env.TYPEFORM_TOKEN;
  if (!token) {
    throw new Error("Typeform is not configured");
  }

  const url = new URL(
    `https://api.typeform.com/forms/${TYPEFORM_FORM_ID}/responses`,
  );
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  url.searchParams.set("page_size", "1000");
  // Only responses that actually answered Q11, and only that answer in the
  // payload — keeps the response small and avoids pulling applicant PII.
  url.searchParams.set("answered_fields", HEARD_ABOUT_FIELD_ID);
  url.searchParams.set("fields", HEARD_ABOUT_FIELD_ID);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Typeform API ${res.status}: ${body.slice(0, 200) || res.statusText}`,
    );
  }

  const data = (await res.json()) as {
    total_items?: number;
    items?: TypeformResponse[] | null;
  };

  const counts = new Map<string, number>();
  for (const item of data.items ?? []) {
    for (const answer of item.answers ?? []) {
      if (answer.field?.id !== HEARD_ABOUT_FIELD_ID) continue;
      const label = answer.choice?.label ?? answer.choice?.other;
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }

  return counts;
}

function pctDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

async function fetchTypeformSources(
  days: number,
): Promise<TypeformSourceSummary> {
  "use cache";
  cacheLife("dashboard");
  cacheTag("typeform");

  const current = windowForLastNDays(days);
  const prevEnd = new Date(current.since.slice(0, 10));
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  const previous = {
    since: `${isoDate(prevStart)}T00:00:00Z`,
    until: `${isoDate(prevEnd)}T23:59:59Z`,
  };

  const [counts, prevCounts] = await Promise.all([
    fetchResponseCounts(current.since, current.until),
    fetchResponseCounts(previous.since, previous.until),
  ]);

  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const previousTotal = [...prevCounts.values()].reduce((a, b) => a + b, 0);

  const rows: ApplicationSourceRow[] = [...counts.entries()]
    .map(([label, count]) => {
      const previousCount = prevCounts.get(label) ?? 0;
      return {
        label,
        count,
        previousCount,
        share: total > 0 ? count / total : 0,
        deltaPct: pctDelta(count, previousCount),
      };
    })
    .sort((a, b) => b.count - a.count);

  return { total, previousTotal, rows };
}

export const getTypeformSources = fetchTypeformSources;
