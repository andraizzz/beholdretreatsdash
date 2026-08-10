/**
 * Rules-based picks for the CEO summary strip's two "narrative" tiles. Not
 * AI — deterministic so it updates whenever data updates rather than being
 * locked to the once-a-week AI generation, and cheap enough to run every
 * request. The AI takeaways below the strip still tell the fuller story;
 * these tiles just point at the biggest number.
 */

import type { Ga4RollingSummary } from "@/lib/sources/ga4";
import type {
  AttributionComparison,
  AttributionRow,
} from "@/lib/attribution-compare";
import { findAttributionMismatches } from "@/lib/attribution-compare";

export type Signal = {
  headline: string;
  detail: string;
};

const MIN_SESSIONS_FOR_SIGNAL = 5;

/**
 * GA4 channels that aren't real actionable channels — bucketing them into
 * the "biggest positive signal" tile would surface unactionable text like
 * "Unassigned up 4660%" (Unassigned is GA4's junk bucket for traffic where
 * the source couldn't be determined; you can't "double down on Unassigned").
 */
const NON_ACTIONABLE_CHANNELS = new Set([
  "Unassigned",
  "(unassigned)",
  "(other)",
  "Direct",
]);

function isActionable(channel: string): boolean {
  return !NON_ACTIONABLE_CHANNELS.has(channel);
}

function avg(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pctChange(current: number, baseline: number): number | null {
  if (baseline === 0) return current === 0 ? 0 : null;
  return Math.round(((current - baseline) / baseline) * 1000) / 10;
}

/**
 * Biggest positive channel signal: channel with the largest positive %
 * change of this-week's sessions vs. the average of the prior 4 weeks,
 * filtered by a minimum-volume floor so a channel jumping from 1 to 3
 * sessions doesn't dominate.
 */
export function pickPositiveSignal(rolling: Ga4RollingSummary): Signal | null {
  const candidates = rolling.perChannel
    .map((c) => {
      const current = c.sessionsByWeek[0];
      const baseline = avg(c.sessionsByWeek.slice(1));
      return { channel: c.channel, current, baseline, pct: pctChange(current, baseline) };
    })
    .filter(
      (c) =>
        isActionable(c.channel) &&
        c.current >= MIN_SESSIONS_FOR_SIGNAL &&
        c.pct !== null &&
        c.pct > 0,
    )
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));

  const top = candidates[0];
  if (!top) return null;

  return {
    headline: `${top.channel} up ${top.pct}%`,
    detail: `${Math.round(top.current)} sessions this week vs. ${Math.round(top.baseline)} avg over prior 4 weeks`,
  };
}

/**
 * Biggest thing to fix. Prefers a real attribution mismatch (GA4 vs.
 * applicant self-report differing by >10pt on the same channel category)
 * since those point at broken tracking. Falls back to the channel with the
 * largest *negative* change vs. 4-week average if no mismatches exist.
 */
export function pickFixSignal(
  rolling: Ga4RollingSummary,
  attribution: AttributionComparison,
): Signal | null {
  const mismatches = findAttributionMismatches(attribution);
  const top = mismatches[0];
  if (top) return mismatchToSignal(top);

  const declines = rolling.perChannel
    .map((c) => {
      const current = c.sessionsByWeek[0];
      const baseline = avg(c.sessionsByWeek.slice(1));
      return { channel: c.channel, current, baseline, pct: pctChange(current, baseline) };
    })
    .filter(
      (c) =>
        isActionable(c.channel) &&
        c.baseline >= MIN_SESSIONS_FOR_SIGNAL &&
        c.pct !== null &&
        c.pct < 0,
    )
    .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0));

  const worst = declines[0];
  if (!worst) return null;

  return {
    headline: `${worst.channel} down ${Math.abs(worst.pct ?? 0)}%`,
    detail: `${Math.round(worst.current)} sessions this week vs. ${Math.round(worst.baseline)} avg over prior 4 weeks`,
  };
}

function mismatchToSignal(row: AttributionRow): Signal {
  const higher = row.gap > 0 ? "applicants" : "GA4";
  const higherPct = Math.max(row.ga4Pct, row.typeformPct);
  const lowerPct = Math.min(row.ga4Pct, row.typeformPct);
  return {
    headline: `${row.label} attribution off by ${Math.round(Math.abs(row.gap))}pt`,
    detail:
      `${higher} report it drives ${Math.round(higherPct)}% of ` +
      `${row.gap > 0 ? "applications" : "traffic"}; ` +
      `${row.gap > 0 ? "GA4 traffic" : "applicant self-report"} shows just ` +
      `${Math.round(lowerPct)}% — likely broken tracking or misclassification.`,
  };
}
