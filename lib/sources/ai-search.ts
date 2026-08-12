import { cacheLife, cacheTag } from "next/cache";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { detectBrandMentions } from "@/lib/brand-mention";

/**
 * AI Search Visibility — asks the three major AI-search touchpoints
 * (ChatGPT / Claude / Perplexity) high-intent retreat queries once a week
 * and detects which brand names appear in each answer. Behold's Typeform
 * data shows ~13%% of applicants cite "AI Search" since the domain launch
 * so this measures a real growing channel.
 *
 * Provider routing:
 * - Anthropic (Claude): AI SDK + Vercel AI Gateway. Uses the existing
 *   gateway integration that insights.ts already relies on — no new
 *   ANTHROPIC_API_KEY needed. The web_search tool comes from the
 *   @ai-sdk/anthropic provider and is passed through the gateway.
 * - OpenAI + Perplexity: direct fetch. Neither has AI Gateway passthrough
 *   for their web-enabled search APIs today; both need their own API keys.
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

export const AI_PROVIDERS: AiProvider[] = ["chatgpt", "claude", "perplexity"];

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
  // Anthropic routes via Vercel AI Gateway (same integration insights uses)
  // so it doesn't need a direct provider key here. Only OpenAI + Perplexity
  // require their own credentials.
  return Boolean(process.env.OPENAI_API_KEY && process.env.PERPLEXITY_API_KEY);
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

async function fetchAiSearchVisibility(): Promise<AiSearchSummary> {
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
    generatedAt: new Date().toISOString(),
  };
}

export const getAiSearchVisibility = fetchAiSearchVisibility;
