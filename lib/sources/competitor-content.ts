import { cacheLife, cacheTag } from "next/cache";
import { generateText, Output } from "ai";
import { z } from "zod";

/**
 * Competitor Content Pulse — for each tracked competitor, surface:
 *  - When did they last publish (staleness signal)
 *  - Publishing cadence (posts per month, last ~90 days)
 *  - What they're writing about (LLM-clustered topics from recent titles)
 *
 * Reality check from research: most competitors barely blog. Rythmia's last
 * post is Mar 2024, Posada Natura and Florestral have no blog at all. The
 * "they've gone silent" finding is itself the useful competitive signal.
 * Behold sits in the table for direct comparison.
 *
 * Per-competitor fetch strategy varies with what each site exposes:
 * RSS where available, sitemap XML where not, HTML scrape as last resort.
 * All strategies are graceful — a fetch failure returns an empty post list
 * with an error flag rather than throwing.
 */

export type BlogPost = {
  title: string;
  url: string;
  publishedAt: string | null; // ISO date; null if unparseable
};

export type CompetitorContent = {
  name: string;
  domain: string;
  hasBlog: boolean;
  posts: BlogPost[];
  postsPerMonth: number | null; // rolling last 90 days
  lastPostAt: string | null;
  topics: string[];
  error: string | null;
};

// ---------- Fetch helpers ----------

/**
 * Some competitor origins (Soltara's LiteSpeed setup in particular) send
 * `Vary: User-Agent` and drop the connection outright for bot-shaped UAs —
 * shows up as a Node.js "terminated" fetch error, not a bad status.
 * Sending a real browser UA string bypasses that. Accept a couple of extra
 * headers a real browser would send so we look less bot-like end-to-end.
 */
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Accept:
        "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

function parseRssItems(xml: string): BlogPost[] {
  // Match each <item>...</item> block, then pull title/link/pubDate out.
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return items
    .map((item): BlogPost | null => {
      const title = matchTag(item, "title");
      const link = matchTag(item, "link");
      const pubDateRaw = matchTag(item, "pubDate");
      if (!title || !link) return null;
      const publishedAt = pubDateRaw ? toIsoDate(pubDateRaw) : null;
      return { title: cleanText(title), url: link.trim(), publishedAt };
    })
    .filter((p): p is BlogPost => p !== null);
}

function parseSitemapUrls(
  xml: string,
  pathPattern: RegExp,
): BlogPost[] {
  // <url><loc>...</loc><lastmod>...</lastmod></url> repeated
  const urls = xml.match(/<url[\s\S]*?<\/url>/gi) ?? [];
  return urls
    .map((entry): BlogPost | null => {
      const loc = matchTag(entry, "loc");
      const lastmod = matchTag(entry, "lastmod");
      if (!loc || !pathPattern.test(loc)) return null;
      // Sitemaps don't give a title — derive from the slug for now, we'll
      // fetch the page individually only if we need the real title.
      const slug =
        loc.replace(/\/$/, "").split("/").pop() ?? loc;
      const title = titleFromSlug(slug);
      const publishedAt = lastmod ? toIsoDate(lastmod) : null;
      return { title, url: loc.trim(), publishedAt };
    })
    .filter((p): p is BlogPost => p !== null);
}

function matchTag(source: string, tag: string): string | null {
  const re = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "i",
  );
  const m = source.match(re);
  if (!m) return null;
  // Strip CDATA wrappers if present
  return m[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim();
}

function cleanText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function titleFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\.(html?|php)$/, "")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toIsoDate(input: string): string | null {
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Fallback HTML scrape: look for anchor tags whose href matches a per-site
 * blog-URL pattern. Extract anchor text as title. No dates from this method —
 * publishedAt will be null. Used when RSS/sitemap aren't available.
 */
function extractPostLinks(
  html: string,
  domain: string,
  urlPattern: RegExp,
): BlogPost[] {
  const anchors = html.match(/<a[^>]+href=["'][^"']+["'][^>]*>[\s\S]*?<\/a>/gi) ?? [];
  const seen = new Set<string>();
  const posts: BlogPost[] = [];
  for (const a of anchors) {
    const hrefMatch = a.match(/href=["']([^"']+)["']/i);
    if (!hrefMatch) continue;
    let href = hrefMatch[1];
    if (href.startsWith("/")) href = `https://${domain}${href}`;
    if (!urlPattern.test(href) || seen.has(href)) continue;
    seen.add(href);
    // Grab the anchor's inner text, strip nested tags roughly
    const inner = a
      .replace(/<a[^>]*>/i, "")
      .replace(/<\/a>$/i, "")
      .replace(/<[^>]+>/g, " ");
    const title = cleanText(inner);
    if (!title || title.length < 4) continue;
    posts.push({ title, url: href, publishedAt: null });
  }
  return posts;
}

// ---------- Per-competitor fetchers ----------

async function fetchSoltara(): Promise<CompetitorContent> {
  const base = {
    name: "Soltara",
    domain: "soltara.co",
    hasBlog: true,
  };
  try {
    // Trailing slash intentional — bare /feed 301-redirects here and the
    // redirect follow has been flaky from Vercel's cloud IPs.
    const xml = await fetchText("https://soltara.co/feed/");
    const posts = parseRssItems(xml);
    return finalize(base, posts, null);
  } catch (error) {
    return finalize(base, [], errMsg(error));
  }
}

async function fetchNewLifeRising(): Promise<CompetitorContent> {
  const base = {
    name: "New Life Rising",
    domain: "newliferising.com",
    hasBlog: true,
  };
  try {
    // Wix's sitemap-index nests blog posts under a sub-sitemap. Fetch it
    // directly (their apex domain sitemap is empty; the www version is the
    // one their robots.txt points to). Posts live at /post/{slug}.
    const xml = await fetchText(
      "https://www.newliferising.com/blog-posts-sitemap.xml",
    );
    const posts = parseSitemapUrls(xml, /\/post\//i);
    return finalize(base, posts, null);
  } catch (error) {
    return finalize(base, [], errMsg(error));
  }
}

async function fetchRythmia(): Promise<CompetitorContent> {
  const base = {
    name: "Rythmia",
    domain: "rythmia.com",
    hasBlog: true,
  };
  try {
    // Use the sitemap, NOT an HTML scrape of /blog. The blog index only
    // exposes a handful of links (the rest load client-side) and carries no
    // dates, which is why this reported "no recent posts" on 2026-08-26
    // while Rythmia had in fact published the day before. The sitemap has
    // all ~95 posts with real <lastmod> dates.
    //
    // Note the www: rythmia.com/sitemap.xml 301-redirects to www, and the
    // redirect follow has been unreliable from Vercel's cloud IPs.
    const xml = await fetchText("https://www.rythmia.com/sitemap.xml");
    // Category pages share the same path prefix as posts. Most are
    // single-word slugs so the hyphen requirement filters them, but
    // "costa-rica" is hyphenated and slipped through, polluting the topic
    // clustering and gap analysis with a meaningless "Costa Rica" title.
    // Deny-list the known category slugs explicitly.
    const RYTHMIA_CATEGORY_SLUGS = new Set([
      "ayahuasca",
      "costa-rica",
      "integration",
      "leadership",
      "prep",
      "program",
      "safety",
      "stories",
    ]);
    const posts = parseSitemapUrls(xml, /\/blog\/[a-z0-9]+-[a-z0-9-]+$/i).filter(
      (p) => {
        const slug = p.url.replace(/\/$/, "").split("/blog/")[1] ?? "";
        return !RYTHMIA_CATEGORY_SLUGS.has(slug);
      },
    );
    return finalize(base, posts, null);
  } catch (error) {
    return finalize(base, [], errMsg(error));
  }
}

async function fetchBehold(): Promise<CompetitorContent> {
  const base = {
    name: "Behold Retreats",
    domain: "beholdretreats.com",
    hasBlog: true,
  };
  try {
    // Behold's Rank Math sitemap-index → walk the post-sitemap children,
    // which include real <lastmod> dates. Falls back to a HTML scrape of
    // /blog if the sitemap ever moves.
    const posts = await fetchBeholdFromSitemap();
    if (posts.length > 0) return finalize(base, posts, null);
    const html = await fetchText("https://beholdretreats.com/blog");
    const scraped = extractPostLinks(
      html,
      "beholdretreats.com",
      /beholdretreats\.com\/blog\/[a-z0-9-]+/i,
    );
    return finalize(base, scraped, null);
  } catch (error) {
    return finalize(base, [], errMsg(error));
  }
}

async function fetchBeholdFromSitemap(): Promise<BlogPost[]> {
  const indexXml = await fetchText(
    "https://beholdretreats.com/sitemap_index.xml",
  );
  // Grab all <loc> URLs that look like a post sitemap.
  const subSitemaps = (indexXml.match(/<loc>([^<]+)<\/loc>/gi) ?? [])
    .map((m) => m.replace(/<\/?loc>/gi, "").trim())
    .filter((url) => /post-sitemap\d*\.xml$/i.test(url));

  const posts: BlogPost[] = [];
  for (const subUrl of subSitemaps) {
    try {
      const xml = await fetchText(subUrl);
      posts.push(...parseSitemapUrls(xml, /\/blog\/[a-z0-9-]+/i));
    } catch {
      // Skip a broken sub-sitemap rather than fail the whole fetch.
    }
  }
  return posts;
}

function noBlog(name: string, domain: string): CompetitorContent {
  return {
    name,
    domain,
    hasBlog: false,
    posts: [],
    postsPerMonth: null,
    lastPostAt: null,
    topics: [],
    error: null,
  };
}

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function finalize(
  base: { name: string; domain: string; hasBlog: boolean },
  posts: BlogPost[],
  error: string | null,
): CompetitorContent {
  // Sort newest-first, deduping by URL
  const seen = new Set<string>();
  const unique = posts.filter((p) => {
    if (seen.has(p.url)) return false;
    seen.add(p.url);
    return true;
  });
  unique.sort((a, b) => {
    if (a.publishedAt && b.publishedAt) return b.publishedAt.localeCompare(a.publishedAt);
    if (a.publishedAt) return -1;
    if (b.publishedAt) return 1;
    return 0;
  });

  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const recentDated = unique.filter(
    (p) => p.publishedAt && new Date(p.publishedAt).getTime() >= ninetyDaysAgo,
  );
  const postsPerMonth = recentDated.length > 0 ? recentDated.length / 3 : null;

  const lastPostAt = unique.find((p) => p.publishedAt)?.publishedAt ?? null;

  return {
    ...base,
    posts: unique.slice(0, 15),
    postsPerMonth,
    lastPostAt,
    topics: [], // filled in by cluster pass
    error,
  };
}

// ---------- Combined LLM pass: per-competitor topics + cross-competitor gaps ----------

/**
 * ONE model call produces both outputs. Previously this was 5 calls: four
 * separate topic-clustering calls (one per competitor) plus a fifth for gap
 * analysis — all fed essentially the same input, every competitor's recent
 * post titles. Merging them cut 5 calls to 1 with no loss of output, and
 * removed a double-execution hazard where the gap analysis re-triggered the
 * whole site-fetching pass.
 */
const analysisSchema = z.object({
  perCompetitor: z.array(
    z.object({
      name: z.string(),
      topics: z.array(z.string()).min(0).max(5),
    }),
  ),
  gaps: z
    .array(
      z.object({
        topic: z.string(),
        coveredBy: z.array(z.string()),
        whyItMatters: z.string(),
        suggestedAngle: z.string(),
      }),
    )
    .min(0)
    .max(8),
  beholdStrengths: z.array(z.string()).min(0).max(5),
});

type CombinedAnalysis = z.infer<typeof analysisSchema>;

export type ContentGap = {
  topic: string;
  coveredBy: string[];
  whyItMatters: string;
  suggestedAngle: string;
};

export type ContentGapAnalysis = {
  gaps: ContentGap[];
  /** Topics Behold covers that competitors don't — worth defending. */
  beholdStrengths: string[];
  /** Sample sizes, so the UI can be honest about a thin week. */
  competitorPostCount: number;
  beholdPostCount: number;
};

const EMPTY_ANALYSIS: CombinedAnalysis = {
  perCompetitor: [],
  gaps: [],
  beholdStrengths: [],
};

async function analyzeAllContent(
  all: CompetitorContent[],
): Promise<CombinedAnalysis> {
  const withPosts = all.filter((c) => c.posts.length > 0);
  if (withPosts.length === 0) return EMPTY_ANALYSIS;

  const block = withPosts
    .map(
      (c) =>
        `${c.name}${c.name === "Behold Retreats" ? " (US — our own site)" : ""}:\n${c.posts
          .slice(0, 12)
          .map((p) => `  - ${p.title}`)
          .join("\n")}`,
    )
    .join("\n\n");

  const prompt = `You are an SEO content strategist for Behold Retreats, a luxury plant-medicine retreat company (ayahuasca, 5-MeO-DMT, psilocybin) in Costa Rica, Mexico, and Portugal. Their audience is nervous first-timers wanting a safe, medically-supervised, high-end experience.

Recent blog post titles, grouped by site:

${block}

Produce three things:

1. perCompetitor — for EVERY site listed above (including Behold), 2-5 concise topic themes (2-6 words each) summarizing what they write about. Use the exact site names as given. Prefer specific themes ("post-retreat integration") over generic ones ("wellness").

2. gaps — up to 8 topics that one or more COMPETITORS cover and Behold does not. Rules:
   - Ground every gap in titles actually listed above. Do not invent topics nobody wrote about.
   - Skip brand-specific news (their own alumni stories, their center announcements) — Behold can't act on those.
   - Prefer gaps with genuine search intent.
   - coveredBy: only competitor names from the data above.
   - whyItMatters: one sentence of search/business rationale.
   - suggestedAngle: one concrete post angle fitting Behold's first-timer, safety-forward, luxury positioning.

3. beholdStrengths — up to 5 topics Behold covers that competitors do NOT. Worth defending.

Be concise. No preamble.`;

  try {
    const { output } = await generateText({
      model: "anthropic/claude-sonnet-5",
      output: Output.object({ schema: analysisSchema }),
      prompt,
    });
    return output;
  } catch {
    // Analysis is additive — degrade to empty rather than breaking the
    // content pulse table, which is useful on its own.
    return EMPTY_ANALYSIS;
  }
}

// ---------- Public ----------

/**
 * Single source of truth for everything content-related: fetches all four
 * blogs, runs the one combined analysis call, and returns rows plus gaps.
 * Both the Content Pulse table and the Content Gaps section read from this,
 * so the expensive work happens exactly once per cache entry.
 */
async function fetchCompetitorContent(): Promise<{
  rows: CompetitorContent[];
  gaps: ContentGap[];
  beholdStrengths: string[];
  competitorPostCount: number;
  beholdPostCount: number;
}> {
  "use cache: remote";
  cacheLife("weekly");
  cacheTag("competitor-content");

  const [soltara, newLife, rythmia, behold] = await Promise.all([
    fetchSoltara(),
    fetchNewLifeRising(),
    fetchRythmia(),
    fetchBehold(),
  ]);

  const withBlogs = [soltara, newLife, rythmia, behold];
  const analysis = await analyzeAllContent(withBlogs);

  const topicsByName = new Map(
    analysis.perCompetitor.map((p) => [p.name, p.topics]),
  );
  const withTopics = withBlogs.map((c) => ({
    ...c,
    topics: topicsByName.get(c.name) ?? [],
  }));

  const competitorPostCount = withBlogs
    .filter((c) => c.name !== "Behold Retreats")
    .reduce((n, c) => n + c.posts.length, 0);
  const beholdPostCount =
    withBlogs.find((c) => c.name === "Behold Retreats")?.posts.length ?? 0;

  const noBlogs = [
    noBlog("Posada Natura", "posadanatura.org"),
    noBlog("Florestral", "wethemedicine.secure.retreat.guru"),
  ];

  // Sort: has-blog first (by staleness — freshest first), then no-blog
  const ordered = [
    ...withTopics.sort((a, b) => {
      if (!a.lastPostAt && !b.lastPostAt) return 0;
      if (!a.lastPostAt) return 1;
      if (!b.lastPostAt) return -1;
      return b.lastPostAt.localeCompare(a.lastPostAt);
    }),
    ...noBlogs,
  ];

  return {
    rows: ordered,
    gaps: analysis.gaps,
    beholdStrengths: analysis.beholdStrengths,
    competitorPostCount,
    beholdPostCount,
  };
}

export const getCompetitorContent = fetchCompetitorContent;

/** Content Pulse table reads just the rows. */
export async function getCompetitorContentPulse(): Promise<CompetitorContent[]> {
  return (await fetchCompetitorContent()).rows;
}

/** Content Gaps section reads the analysis half. Same cache entry as the
 *  pulse above, so this costs nothing extra. */
export async function getContentGaps(): Promise<ContentGapAnalysis> {
  const { gaps, beholdStrengths, competitorPostCount, beholdPostCount } =
    await fetchCompetitorContent();
  return { gaps, beholdStrengths, competitorPostCount, beholdPostCount };
}
