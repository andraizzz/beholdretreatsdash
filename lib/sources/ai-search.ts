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

async function fetchAiSearchVisibility(): Promise<AiSearchSummary> {
  "use cache: remote";
  cacheLife("weekly");
  cacheTag("ai-search");

  // Fan out — 8 queries × 3 providers = 24 calls, all in parallel.
  const jobs: Promise<QueryResult>[] = [];
  for (const provider of AI_PROVIDERS) {
    for (const query of AI_SEARCH_QUERIES) {
      jobs.push(runOne(provider, query));
    }
  }
  const results = await Promise.all(jobs);

  return {
    results,
    generatedAt: new Date().toISOString(),
  };
}

export const getAiSearchVisibility = fetchAiSearchVisibility;
