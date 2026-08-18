/**
 * 3-month initiatives Behold is running (Aug 12 → Nov 12, 2026). Andra
 * decided (2026-08-12) that updates flow via chat rather than a form: she
 * tells me the new number, I edit this file and redeploy. Keeps the
 * infrastructure surface at zero.
 *
 * Each initiative has metadata (title/owner/status/dates) plus an optional
 * `liveMetric` key that lets the UI pull real numbers from the existing
 * data sources instead of me hand-updating them. See renderers in
 * components/initiative-card.tsx for how each type is displayed.
 */

export type InitiativeStatus =
  | "not_started"
  | "in_progress"
  | "complete"
  | "blocked";

export type LiveMetricKind =
  /** Number pulled from Places API — current review count for a specific brand. */
  | { kind: "review_count"; brand: string; targetLabel: string }
  /** Pulls from AI Search data — how many of a specific query set Behold appears in. */
  | { kind: "ai_search_queries"; queries: string[] }
  /** Pulls attribution comparison — the pt-gap for a canonical channel. */
  | { kind: "attribution_gap"; category: "search" | "social" | "email" | "referral" | "ai" }
  /** Checks GA4 referral sources for a specific domain. */
  | { kind: "referral_domain"; domain: string; label: string };

export type Initiative = {
  id: string;
  title: string;
  description: string;
  owner: string;
  status: InitiativeStatus;
  startedAt: string; // ISO date
  targetAt: string; // ISO date
  /** What we're tracking — text description shown on the card. */
  metric: string;
  /** Manual progress number/text updated by Andra via chat. */
  manualProgress: string;
  /** Optional live-data pull. If set, the card also renders this alongside manualProgress. */
  liveMetric?: LiveMetricKind;
  /** Newest notes first. Append via chat updates. */
  notes: { date: string; text: string }[];
};

// Anchor dates: initiative window is Andra's ask for "next 3 months."
const KICKOFF = "2026-08-12";
const TARGET = "2026-11-12";

export const INITIATIVES: Initiative[] = [
  {
    id: "b2b-outreach",
    title: "B2B outreach — 20 companies",
    description:
      "Reach out to HR departments and decision-makers at 20 companies we think would be open to sending employees to Behold retreats (executive wellness, leadership development, etc.).",
    owner: "Andra",
    status: "not_started",
    startedAt: KICKOFF,
    targetAt: TARGET,
    metric: "Companies contacted / responded / meeting booked / closed",
    manualProgress: "0 of 20 contacted",
    notes: [],
  },
  {
    id: "linkedin-seo",
    title: "LinkedIn SEO-keyword content",
    description:
      "Start LinkedIn post copy with keywords we're SEO-optimizing for. Testing whether LinkedIn authority signals help move Google organic rankings for the same terms.",
    owner: "Andra",
    status: "not_started",
    startedAt: KICKOFF,
    targetAt: TARGET,
    metric:
      "Posts published + GSC position change on target keywords (measured in the SEO page)",
    manualProgress: "0 posts published; target keyword list not yet defined",
    notes: [],
  },
  {
    id: "primal-focus",
    title: "Primal Focus newsletter partnership",
    description:
      "Newsletter partnership with Primal Focus (microdosing company). Cross-promotion to their subscriber base with a link back to Behold.",
    owner: "Andra",
    status: "not_started",
    startedAt: KICKOFF,
    targetAt: TARGET,
    metric:
      "Referral sessions from primalfocus.com in GA4 + applicants citing them",
    manualProgress: "Partnership not yet launched",
    liveMetric: {
      kind: "referral_domain",
      domain: "primalfocus.com",
      label: "Primal Focus referrals detected in GA4",
    },
    notes: [],
  },
  {
    id: "social-attribution-fix",
    title: "Close the Social attribution gap",
    description:
      "GA4 sees ~3% of traffic from Social; applicants self-report ~17%. That 14pt gap points at broken UTMs on Instagram/social links. Fix the tagging so real social traffic gets counted.",
    owner: "Andra",
    status: "not_started",
    startedAt: KICKOFF,
    targetAt: "2026-09-15",
    metric:
      "Gap between GA4 Social % and Typeform Social Media % on the attribution table (Overview page)",
    manualProgress: "Not started; needs Instagram bio + link-in-bio UTM audit",
    liveMetric: { kind: "attribution_gap", category: "social" },
    notes: [],
  },
  {
    id: "ai-search-whitespace",
    title: "Target AI Search white space",
    description:
      "AI Search visibility scan revealed queries where nobody in the plant-medicine set appears — 'psilocybin retreat with medical oversight' and 'ayahuasca retreat portugal legal' are open territory. Also defend the queries where Behold already wins outright (5-MeO CR, women's ayahuasca). Publish content targeted at these.",
    owner: "Content team",
    status: "not_started",
    startedAt: KICKOFF,
    targetAt: TARGET,
    metric:
      "Behold appearance across the 4 target queries × 3 AI providers = 12 slots. Baseline: 5.",
    manualProgress: "Baseline set; no new content published yet",
    liveMetric: {
      kind: "ai_search_queries",
      queries: [
        "psilocybin retreat with medical oversight",
        "ayahuasca retreat portugal legal",
        "5-meo-dmt retreat costa rica",
        "womens ayahuasca retreat costa rica",
      ],
    },
    notes: [],
  },
  {
    id: "google-review-push",
    title: "Push Google rating from 4.8★ → 4.9★",
    description:
      "Behold currently sits at 4.8★. Per Andra's math, 14 more 5-star reviews would tip the rounded average to 4.9 — closing a real perceived-quality gap with Soltara (4.9) at the same time. Review volume is also small overall vs. Rythmia (410) and Soltara (287), so this doubles as a volume push. A simple post-retreat 'leave us a Google review' ask (email or QR at checkout) should close this fast — the underlying satisfaction is clearly already there.",
    owner: "Ops / Retreat team",
    status: "not_started",
    startedAt: KICKOFF,
    targetAt: TARGET,
    metric: "Google rating on the Behold Places listing (target 4.9★)",
    manualProgress:
      "Ask flow not yet set up · goal: 14 more 5-star reviews to reach 4.9★",
    liveMetric: {
      kind: "review_count",
      brand: "Behold Retreats",
      targetLabel: "goal: 4.9★ rating — needs ~14 more 5-star reviews",
    },
    notes: [],
  },
  {
    id: "prove-or-kill-paid-spend",
    title: "Prove or kill the $140/wk paid spend",
    description:
      "Neither Bing Ads ($55/wk) nor Costa Rica News X Ads ($85/wk) has attribution clean enough to know if they produce a single application. Add campaign-specific UTMs or a dedicated landing page so Typeform can attribute conversions back. Then keep or kill each based on evidence, not gut feel.",
    owner: "Andra",
    status: "not_started",
    startedAt: KICKOFF,
    targetAt: "2026-10-01",
    metric: "Applications attributable to Bing / CR News via UTMs or landing page",
    manualProgress:
      "Total spend running ~$605/mo; attributed applications: unknown",
    notes: [],
  },
];

export function getInitiatives(): Initiative[] {
  return INITIATIVES;
}
