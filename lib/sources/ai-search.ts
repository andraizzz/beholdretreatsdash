import { cacheLife, cacheTag } from "next/cache";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { detectBrandMentions } from "@/lib/brand-mention";

/**
 * AI Search Visibility — asks an AI-search engine high-intent retreat
 * queries and detects which brand names appear in each answer. Behold's
 * Typeform data shows ~13%% of applicants cite "AI Search" since the domain
 * launch, so this measures a real and growing channel.
 *
 * COST HISTORY (2026-08-26): this originally queried ChatGPT + Claude +
 * Perplexity, 24 calls per generation. Claude ran through the Vercel AI
 * Gateway and was by far the most expensive leg: its web_search tool bills
 * $10/1,000 searches (we allowed 5 per query = up to 40 searches) AND
 * injects every search result into context, ballooning input tokens. A full
 * generation cost roughly $1.00-1.50, not the ~$0.30 originally estimated.
 *
 * That compounded badly with two other facts:
 *   1. Vercel's remote cache key includes the build ID, so EVERY deploy
 *      invalidated the weekly cache and the next page view regenerated.
 *      13 deploys in two weeks meant ~13 full regenerations.
 *   2. Thrown errors are never cached, so once the Gateway hit a 402 every
 *      subsequent page view retried the whole thing.
 * Together those drained a $5 Gateway balance.
 *
 * Andra's call: run Perplexity only. It's the cheapest leg (~$0.30 per full
 * generation), it's purpose-built for search, and critically it uses her own
 * PERPLEXITY_API_KEY rather than Vercel Gateway credits — so AI Search no
 * longer competes with weekly insights for the same balance.
 *
 * The ChatGPT and Claude callers below are intentionally kept but unwired.
 * To re-enable either, add it back to AI_PROVIDERS and update
 * isAiSearchConfigured() to require its key. Be deliberate about it: Claude
 * in particular is ~5x the cost of Perplexity for this workload.
 */

/**
 * High-intent queries covering Behold's product line: all four medicines
 * (ayahuasca / 5-MeO-DMT / psilocybin / women's ayahuasca) × three
 * geographies (Costa Rica / Mexico / Portugal) × target-audience angles
 * (first-timer / luxury / medical / safe / legal). Update this list to
 * shift which queries the weekly generation covers.
 */
export const AI_SEARCH_QUERIES = [
  "best ayahuasca retreat in costa rica",
  "safe first-time ayahuasca retreat luxury",
  "5-meo-dmt retreat costa rica",
  "psilocybin retreat with medical oversight",
  "womens ayahuasca retreat costa rica",
  "ayahuasca retreat portugal legal",
  "best plant medicine retreat for beginners",
  "luxury plant medicine retreat all inclusive",
] as const;

export type AiProvider = "chatgpt" | "claude" | "perplexity";

/**
 * Active providers. Perplexity-only as of 2026-08-26 — see the cost note at
 * the top of this file. Adding "claude" back here also requires Vercel AI
 * Gateway credits; adding "chatgpt" requires OPENAI_API_KEY to have balance.
 * Update isAiSearchConfigured() to match whenever this changes.
 */
export const AI_PROVIDERS: AiProvider[] = ["perplexity"];

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  perplexity: "Perplexity",
};

export type QueryResult = {
  provider: AiProvider;
  query: string;
  /** Brand names in order of first mention in the response text. */
  mentions: string[];
  /** Raw response text — only used in the debug route, trimmed in the UI. */
  responseText: string;
  error: string | null;
};

export type AiSearchSummary = {
  results: QueryResult[];
  /** ISO date generated (roughly, since generation is weekly-cached). */
  generatedAt: string;
};

export function isAiSearchConfigured(): boolean {
  // Perplexity-only (see cost note at top). Deliberately does NOT require
  // OPENAI_API_KEY any more — requiring a key we no longer call would dark
  // the whole section for no reason.
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

// ---------- Provider callers ----------

async function callAnthropic(query: string): Promise<string> {
  // AI Gateway route: string model form + provider-specific tool from the
  // @ai-sdk/anthropic package. The gateway proxies the tool call through
  // to Anthropic's Messages API and returns the response text. No direct
  // ANTHROPIC_API_KEY needed — Vercel injects the gateway credential.
  //
  // The `as never` cast bypasses a spurious type mismatch between
  // @ai-sdk/anthropic v3 (which types the tool's input as `{ query: string }`)
  // and ai v6's tools param (which infers `never` for provider-native tools).
  // Runtime shape is correct; the AI SDK's own docs use this exact pattern.
  const { text } = await generateText({
    model: "anthropic/claude-sonnet-5",
    prompt: query,
    tools: {
      web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }) as never,
    },
  });
  return text;
}

type OpenAiResponse = {
  output_text?: string;
  output?: {
    content?: { type?: string; text?: string }[];
  }[];
};

async function callOpenAI(query: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY missing");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5",
      tools: [{ type: "web_search" }],
      input: query,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `OpenAI ${res.status}: ${body.slice(0, 200) || res.statusText}`,
    );
  }

  const data = (await res.json()) as OpenAiResponse;
  if (data.output_text) return data.output_text;

  // Fallback: walk output[].content[].text if output_text isn't populated
  const texts: string[] = [];
  for (const item of data.output ?? []) {
    for (const c of item.content ?? []) {
      if (c.type?.includes("text") && c.text) texts.push(c.text);
    }
  }
  return texts.join("\n");
}

type PerplexityResponse = {
  choices?: { message?: { content?: string } }[];
};

async function callPerplexity(query: string): Promise<string> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) throw new Error("PERPLEXITY_API_KEY missing");

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar-pro",
      messages: [{ role: "user", content: query }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Perplexity ${res.status}: ${body.slice(0, 200) || res.statusText}`,
    );
  }

  const data = (await res.json()) as PerplexityResponse;
  return data.choices?.[0]?.message?.content ?? "";
}

const PROVIDER_FN: Record<AiProvider, (q: string) => Promise<string>> = {
  chatgpt: callOpenAI,
  claude: callAnthropic,
  perplexity: callPerplexity,
};

// ---------- Public API ----------

async function runOne(
  provider: AiProvider,
  query: string,
): Promise<QueryResult> {
  try {
    const responseText = await PROVIDER_FN[provider](query);
    return {
      provider,
      query,
      mentions: detectBrandMentions(responseText),
      responseText,
      error: null,
    };
  } catch (error) {
    return {
      provider,
      query,
      mentions: [],
      responseText: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run a provider's queries with limited concurrency AND explicit spacing
 * between request starts. Perplexity's Tier 0 (50 RPM headroom on paper)
 * still rejected 7 of 8 requests with a concurrency-2 pool — a pool with
 * no inter-request delay starts request #2 the instant #1's socket opens,
 * which is bursty enough to trip whatever short-window cap Perplexity
 * actually enforces underneath the published RPM figure. Real fix is
 * wall-clock spacing, not just a lower concurrency count. This runs once
 * a week in a background cache fill, so a few extra seconds is free.
 */
async function runProviderQueries(
  provider: AiProvider,
  concurrency: number,
  minDelayMs: number,
): Promise<QueryResult[]> {
  const queue = [...AI_SEARCH_QUERIES];
  const results: QueryResult[] = [];

  async function worker() {
    while (queue.length > 0) {
      const query = queue.shift();
      if (!query) break;
      results.push(await runOne(provider, query));
      if (minDelayMs > 0 && queue.length > 0) await sleep(minDelayMs);
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, () => worker()),
  );
  return results;
}

/** Per-provider concurrency + spacing. Perplexity needs to be fully
 *  sequential with real delay; OpenAI/Anthropic tolerated full concurrency
 *  fine in testing. */
const PROVIDER_THROTTLE: Record<
  AiProvider,
  { concurrency: number; minDelayMs: number }
> = {
  chatgpt: { concurrency: 4, minDelayMs: 0 },
  claude: { concurrency: 4, minDelayMs: 0 },
  perplexity: { concurrency: 1, minDelayMs: 2000 },
};

async function fetchAiSearchVisibility(
  /** ISO Monday of the current week. Part of the cache key, so regeneration
   *  pins to the calendar week instead of drifting to whatever weekday it
   *  last ran on. Callers pass getCurrentWeekStart(). */
  weekStart: string,
): Promise<AiSearchSummary> {
  "use cache: remote";
  cacheLife("weekly");
  cacheTag("ai-search");

  // Providers run in parallel with each other; each provider's own 8
  // queries are throttled internally per PROVIDER_THROTTLE.
  const perProvider = await Promise.all(
    AI_PROVIDERS.map((provider) => {
      const { concurrency, minDelayMs } = PROVIDER_THROTTLE[provider];
      return runProviderQueries(provider, concurrency, minDelayMs);
    }),
  );

  return {
    results: perProvider.flat(),
    generatedAt: weekStart,
  };
}

export const getAiSearchVisibility = fetchAiSearchVisibility;
