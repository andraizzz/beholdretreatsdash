/**
 * GA4 measures what the browser reports; Typeform captures what the applicant
 * says. When they disagree by a lot on the same channel category, that's a
 * real attribution problem worth calling out (e.g. Social showing 1% in GA4
 * but 19% in Typeform means UTMs are broken or the channel is being
 * misclassified).
 *
 * This normalizes both sources onto a shared set of canonical categories so
 * the two distributions can be plotted side by side.
 */

import type { ChannelRow } from "@/lib/sources/ga4";
import type { ApplicationSourceRow } from "@/lib/sources/typeform";

export type CanonicalChannel = "search" | "social" | "email" | "referral" | "ai";

export const CANONICAL_LABELS: Record<CanonicalChannel, string> = {
  search: "Search",
  social: "Social",
  email: "Email",
  referral: "Referral / Article",
  ai: "AI",
};

/** GA4 default channel group → canonical. Anything not listed is "unmapped". */
const GA4_TO_CANONICAL: Record<string, CanonicalChannel> = {
  "Organic Search": "search",
  "Paid Search": "search",
  "Organic Social": "social",
  "Paid Social": "social",
  "Email": "email",
  "Referral": "referral",
  "AI Assistant": "ai",
};

/** Typeform "How did you hear" choice label → canonical. */
const TYPEFORM_TO_CANONICAL: Record<string, CanonicalChannel> = {
  "Google or other Search Engine": "search",
  "Social Media": "social",
  "Our Email Outreach": "email",
  "Online Article / News Publication": "referral",
  "AI Search": "ai",
};

export type AttributionRow = {
  category: CanonicalChannel;
  label: string;
  ga4Pct: number;
  typeformPct: number;
  ga4Sessions: number;
  typeformCount: number;
  /** Percentage-point gap (typeform − ga4). Positive: over-reported vs traffic. */
  gap: number;
};

export type AttributionComparison = {
  rows: AttributionRow[];
  /** GA4 channels that don't map to any canonical bucket. */
  unmappedGa4: { channel: string; sessions: number; pct: number }[];
  /** Typeform choices that don't map (Podcast, Friend/WoM, Blog, TV, other). */
  unmappedTypeform: { label: string; count: number; pct: number }[];
};

const MEANINGFUL_GAP_PT = 10;

export function buildAttributionComparison(
  ga4ByChannel: ChannelRow[],
  typeformRows: ApplicationSourceRow[],
): AttributionComparison {
  const totalGa4Sessions = ga4ByChannel.reduce((s, r) => s + r.sessions, 0);
  const totalTypeformCount = typeformRows.reduce((s, r) => s + r.count, 0);

  // Sum sessions/counts per canonical bucket
  const ga4ByCanonical = new Map<CanonicalChannel, number>();
  const unmappedGa4Raw: { channel: string; sessions: number }[] = [];
  for (const row of ga4ByChannel) {
    const canonical = GA4_TO_CANONICAL[row.channel];
    if (canonical) {
      ga4ByCanonical.set(
        canonical,
        (ga4ByCanonical.get(canonical) ?? 0) + row.sessions,
      );
    } else {
      unmappedGa4Raw.push({ channel: row.channel, sessions: row.sessions });
    }
  }

  const typeformByCanonical = new Map<CanonicalChannel, number>();
  const unmappedTypeformRaw: { label: string; count: number }[] = [];
  for (const row of typeformRows) {
    const canonical = TYPEFORM_TO_CANONICAL[row.label];
    if (canonical) {
      typeformByCanonical.set(
        canonical,
        (typeformByCanonical.get(canonical) ?? 0) + row.count,
      );
    } else {
      unmappedTypeformRaw.push({ label: row.label, count: row.count });
    }
  }

  const categories: CanonicalChannel[] = [
    "search",
    "social",
    "email",
    "referral",
    "ai",
  ];

  const rows: AttributionRow[] = categories.map((category) => {
    const ga4Sessions = ga4ByCanonical.get(category) ?? 0;
    const typeformCount = typeformByCanonical.get(category) ?? 0;
    const ga4Pct =
      totalGa4Sessions > 0 ? (ga4Sessions / totalGa4Sessions) * 100 : 0;
    const typeformPct =
      totalTypeformCount > 0
        ? (typeformCount / totalTypeformCount) * 100
        : 0;
    return {
      category,
      label: CANONICAL_LABELS[category],
      ga4Pct,
      typeformPct,
      ga4Sessions,
      typeformCount,
      gap: typeformPct - ga4Pct,
    };
  });

  const unmappedGa4 = unmappedGa4Raw
    .map((u) => ({
      ...u,
      pct: totalGa4Sessions > 0 ? (u.sessions / totalGa4Sessions) * 100 : 0,
    }))
    .sort((a, b) => b.sessions - a.sessions);

  const unmappedTypeform = unmappedTypeformRaw
    .map((u) => ({
      ...u,
      pct: totalTypeformCount > 0 ? (u.count / totalTypeformCount) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return { rows, unmappedGa4, unmappedTypeform };
}

/** Meaningful mismatches only — for surfacing as the "biggest thing to fix" signal. */
export function findAttributionMismatches(
  comparison: AttributionComparison,
): AttributionRow[] {
  return comparison.rows
    .filter((r) => Math.abs(r.gap) >= MEANINGFUL_GAP_PT)
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap));
}
