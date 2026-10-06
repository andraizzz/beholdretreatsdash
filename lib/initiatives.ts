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

/** An actionable checklist item within an initiative. Used for initiatives
 *  that are really a punch-list of specific tasks (e.g. blog page merges,
 *  SEO refresh checklist) rather than a single tracked number. Optional —
 *  most initiatives don't need it. */
export type TaskItem = { done: boolean; text: string };

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
  /** Optional actionable checklist rendered on the card. Toggle `done` when items complete. */
  tasks?: TaskItem[];
  /** Newest notes first. Append via chat updates. */
  notes: { date: string; text: string }[];
};

// Anchor dates: initiative window is Andra's ask for "next 3 months."
export const KICKOFF = "2026-08-12";
export const TARGET = "2026-11-12";

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
    status: "complete",
    startedAt: KICKOFF,
    targetAt: TARGET,
    metric:
      "Referral sessions from primalfocus.com in GA4 + applicants citing them",
    manualProgress:
      "Launched Sep 17 — a successful awareness play. 474 users from PrimalFocus / email (GA4, Sep 8–Oct 5), ~360 on the Sep 17 peak day. 0 key events and no applications from Primal-tagged traffic, so this was top-of-funnel, not conversion.",
    liveMetric: {
      kind: "referral_domain",
      domain: "primalfocus.com",
      label: "Primal Focus traffic in GA4 since kickoff",
    },
    notes: [
      {
        date: "2026-10-06",
        text: "Marked complete. GA4 (first user source / medium = PrimalFocus / email, last 28 days to Oct 5): 474 total users (476 new, 72 returning), 3,204 events, 58s average engagement time, 0 key events. Traffic spiked on Sep 17 (~360 users) then fell to a low trickle within days. Nothing tagged 'primal' has produced an application or key event. Strong awareness play; worth retargeting this audience later.",
      },
    ],
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
    status: "complete",
    startedAt: KICKOFF,
    targetAt: TARGET,
    metric: "Google rating on the Behold Places listing (target 4.9★)",
    manualProgress:
      "Goal hit: Behold is at 4.9★. Reviews grew 39 → 45 (+6, +15%) since the start of the initiative (baseline 39 recorded Aug 18).",
    liveMetric: {
      kind: "review_count",
      brand: "Behold Retreats",
      targetLabel: "goal reached: 4.9★ · up from 39 reviews at kickoff",
    },
    notes: [
      {
        date: "2026-10-06",
        text: "Reached 4.9★. Review count 39 → 45 (+15.4%) since kickoff.",
      },
    ],
  },
  {
    id: "blog-updates-refreshes",
    title: "Blog updates & refreshes",
    description:
      "Punch-list of specific blog work: merging duplicate pages that split ranking authority, refreshing stale copy and stats on high-traffic posts, and consolidating overlapping content. Blog is Behold's biggest organic asset (43-50% of traffic per the marketing pie) — every duplicate or dated page is leaving ranking + conversion on the table.",
    owner: "Content team",
    status: "not_started",
    startedAt: KICKOFF,
    targetAt: TARGET,
    metric:
      "Tasks completed + GSC rank / clicks movement on the updated pages (measured in the SEO page)",
    manualProgress: "Punch-list below — add items via chat as we spot them",
    tasks: [
      {
        done: false,
        text: "Merge the two \"what is ayahuasca\" pages. Keep /blog/what-is-ayahuasca-explanation-experiences-and-ayahuasca-retreats/ (41% of traffic) and fold /blog/what-is-ayahuasca-origins-benefits-and-how-it-works/ into it (301 redirect the folded URL to the kept one to preserve link equity).",
      },
    ],
    notes: [],
  },
  {
    id: "prove-or-kill-paid-spend",
    title: "Fix or kill the Costa Rica News spend ($85/wk)",
    description:
      "Both paid channels ARE tracked (we assumed otherwise until 2026-08-26). Bing shows up as GA4 'Paid Search' (source: Bing) and is performing fine at ~$0.62/session. Costa Rica News shows up as GA4 'Display' (source: CRNews) at ~$20.44/session, 33x worse. The CR News structure is X ads pointing at a CR News article about Costa Rica wellness, which banners and hyperlinks to Behold. The ads work; the article-to-Behold handoff does not. Roughly 4,554 people/month reach the article and 18 reach Behold, a 0.4% pass-through where 2-5% is normal. Awareness spillover isn't detectable either: branded search sits at 44 impressions/month. Decision: fix the pass-through, or keep the article (free backlink + credibility) and stop paying to promote it.",
    owner: "Andra",
    status: "in_progress",
    startedAt: KICKOFF,
    targetAt: "2026-10-01",
    metric:
      "CR News article-to-Behold pass-through rate (target 3%+) and cost per Behold session (target under $3)",
    manualProgress:
      "Bing healthy at ~$0.62/session — leave alone. CR News at ~$20.44/session with 0.4% pass-through — needs the fixes below or the ad spend gets cut.",
    tasks: [
      {
        done: false,
        text: "Move the Behold banner above the fold in the CR News article and add a hyperlink in the first two paragraphs (currently the handoff is losing 99.6% of readers).",
      },
      {
        done: false,
        text: "Rewrite the CTA to be specific — \"Apply for a Costa Rica retreat\" converts better than a logo or a generic brand mention.",
      },
      {
        done: false,
        text: "Check whether the Behold link in the CR News article is dofollow or nofollow. If dofollow, the SEO value is real and ongoing, which is an argument for keeping the article even if the ad spend gets cut.",
      },
      {
        done: false,
        text: "Set a 30-day decision deadline: if pass-through is still under 3% by 2026-10-01, cut the $85/wk and redirect it to Bing (currently 33x more efficient per session).",
      },
    ],
    notes: [
      {
        date: "2026-10-06",
        text: "Past the 10/01 decision date. Lots of discussion and resourcing here; the open question is still where the conversions are. Latest weekly paid data (Sep 28–Oct 4): Google Ads 8 conv / $262.68, Microsoft Ads 3 conv / $82.93, X Ads 0 conv / $37.81 (261 clicks). Combined 11 conv on $383.42 (CPA $34.86) vs. 5.99 conv on $430.73 the week before. Also trying ChatGPT ads, but getting denied left and right.",
      },
      {
        date: "2026-08-26",
        text: "Found that GA4 'Display' channel = CR News X Ads (not Google Ads). Both paid channels have working UTMs, so attribution was never the problem — the article-to-click handoff is.",
      },
    ],
  },
];

export function getInitiatives(): Initiative[] {
  return INITIATIVES;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Where we are in the 3-month window right now. */
export function getWindowProgress() {
  const start = new Date(`${KICKOFF}T00:00:00Z`).getTime();
  const end = new Date(`${TARGET}T00:00:00Z`).getTime();
  const now = Date.now();
  const totalDays = Math.round((end - start) / DAY_MS);
  const elapsed = Math.min(totalDays, Math.max(0, Math.floor((now - start) / DAY_MS)));
  const daysLeft = Math.max(0, Math.ceil((end - now) / DAY_MS));
  const timePct = Math.round((elapsed / totalDays) * 100);
  return { totalDays, elapsed, daysLeft, timePct };
}
