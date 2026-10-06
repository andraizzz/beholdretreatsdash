/**
 * Resolves an initiative's optional live metric by pulling from the same
 * cached data sources the rest of the dashboard uses. Everything here piggy-
 * backs on existing "use cache: remote" fetchers — no new API calls, no
 * extra cost. If a data source isn't configured or errors, the resolver
 * returns null and the card silently falls back to manualProgress only.
 */

import { getCurrentWeekStart } from "@/lib/week";
import { KICKOFF, type Initiative, type LiveMetricKind } from "@/lib/initiatives";
import { getGa4Summary, getGa4TagMatch, isGa4Configured } from "@/lib/sources/ga4";
import { getTypeformSources, isTypeformConfigured } from "@/lib/sources/typeform";
import { buildAttributionComparison } from "@/lib/attribution-compare";
import {
  getCompetitorReputation,
  isPlacesConfigured,
} from "@/lib/sources/places";
import {
  getAiSearchVisibility,
  isAiSearchConfigured,
} from "@/lib/sources/ai-search";

export type ResolvedLiveMetric = {
  label: string;
  value: string;
  tone: "positive" | "negative" | "neutral";
  detail?: string;
};

export async function resolveLiveMetric(
  init: Initiative,
): Promise<ResolvedLiveMetric | null> {
  if (!init.liveMetric) return null;
  try {
    return await resolve(init.liveMetric);
  } catch {
    // Any live-data failure degrades to manual-only display rather than
    // breaking the initiative card.
    return null;
  }
}

async function resolve(
  m: LiveMetricKind,
): Promise<ResolvedLiveMetric | null> {
  switch (m.kind) {
    case "review_count": {
      if (!isPlacesConfigured()) return null;
      const rows = await getCompetitorReputation();
      const row = rows.find((r) => r.name === m.brand);
      if (!row || row.reviewCount === null) return null;
      return {
        label: "Live Google review count",
        value: `${row.reviewCount} reviews (${row.rating?.toFixed(1) ?? "—"}★)`,
        tone: "neutral",
        detail: m.targetLabel,
      };
    }

    case "ai_search_queries": {
      if (!isAiSearchConfigured()) return null;
      const summary = await getAiSearchVisibility(getCurrentWeekStart());
      const targetSet = new Set(m.queries.map((q) => q.toLowerCase()));
      const relevant = summary.results.filter((r) =>
        targetSet.has(r.query.toLowerCase()),
      );
      const total = relevant.length;
      const beholdIn = relevant.filter((r) =>
        r.mentions.includes("Behold Retreats"),
      ).length;
      return {
        label: "Behold appearance across target queries × 3 providers",
        value: `${beholdIn} of ${total} slots`,
        tone: beholdIn > total / 2 ? "positive" : "neutral",
        detail: `across queries: ${m.queries.join(" · ")}`,
      };
    }

    case "attribution_gap": {
      if (!isGa4Configured() || !isTypeformConfigured()) return null;
      const [ga4, typeform] = await Promise.all([
        getGa4Summary(7),
        getTypeformSources(7),
      ]);
      const comparison = buildAttributionComparison(ga4.byChannel, typeform.rows);
      const row = comparison.rows.find((r) => r.category === m.category);
      if (!row) return null;
      const gap = Math.round(Math.abs(row.gap));
      return {
        label: `Live ${row.label} attribution gap`,
        value: `${gap}pt gap this week`,
        tone: gap < 5 ? "positive" : gap > 10 ? "negative" : "neutral",
        detail: `GA4: ${row.ga4Pct.toFixed(0)}% · applicants: ${row.typeformPct.toFixed(0)}%`,
      };
    }

    case "referral_domain": {
      if (!isGa4Configured()) return null;
      // Match on the brand token in either source or UTM campaign, since the
      // newsletter traffic may be UTM-tagged rather than a clean referral.
      const needle = m.domain.split(".")[0].replace(/focus$/, "");
      const r = await getGa4TagMatch(needle, KICKOFF);
      const top = r.rows
        .slice(0, 3)
        .map((x) => `${x.source} / ${x.medium} / ${x.campaign}: ${x.sessions}`)
        .join(" · ");
      return {
        label: m.label,
        value:
          r.sessions > 0
            ? `${r.sessions.toLocaleString()} sessions · ${r.keyEvents} key events`
            : "no traffic matching 'primal' since kickoff",
        tone: r.keyEvents > 0 ? "positive" : "neutral",
        detail:
          r.sessions > 0
            ? `Peak day ${r.peakDay?.date} (${r.peakDay?.sessions} sessions). ${top}`
            : undefined,
      };
    }
  }
}
