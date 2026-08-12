import { connection } from "next/server";
import {
  getAiSearchVisibility,
  isAiSearchConfigured,
  AI_SEARCH_QUERIES,
  AI_PROVIDERS,
  AI_PROVIDER_LABELS,
  type QueryResult,
} from "@/lib/sources/ai-search";
import { cn } from "@/lib/utils";

export async function AiSearchVisibility() {
  await connection();

  if (!isAiSearchConfigured()) {
    return (
      <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
        AI Search visibility isn&apos;t set up yet. Add three API keys as
        Vercel env vars — <code>ANTHROPIC_API_KEY</code>,{" "}
        <code>OPENAI_API_KEY</code>, <code>PERPLEXITY_API_KEY</code> — to
        query how ChatGPT, Claude, and Perplexity answer high-intent retreat
        prompts. Weekly cached, ~$3/month total cost.
      </div>
    );
  }

  let summary;
  try {
    summary = await getAiSearchVisibility();
  } catch (error) {
    return (
      <div className="rounded-md border border-dashed border-red-300 p-6 text-sm text-red-600">
        Couldn&apos;t load AI Search data:{" "}
        {error instanceof Error ? error.message : String(error)}
      </div>
    );
  }

  // Index into a lookup: [query][provider] → QueryResult
  const grid = new Map<string, Map<string, QueryResult>>();
  for (const r of summary.results) {
    if (!grid.has(r.query)) grid.set(r.query, new Map());
    grid.get(r.query)!.set(r.provider, r);
  }

  const beholdMentions = summary.results.filter((r) =>
    r.mentions.includes("Behold Retreats"),
  ).length;
  const totalSlots = summary.results.length;

  return (
    <div className="space-y-3">
      <div className="text-sm">
        <span className="font-semibold">
          Behold appears in {beholdMentions} of {totalSlots} slots
        </span>{" "}
        <span className="text-muted-foreground">
          ({AI_SEARCH_QUERIES.length} queries × {AI_PROVIDERS.length}{" "}
          providers). Below: which brands each AI names first when asked.
        </span>
      </div>

      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="text-left px-3 py-2 min-w-[240px]">Query</th>
                {AI_PROVIDERS.map((p) => (
                  <th key={p} className="text-left px-3 py-2 min-w-[220px]">
                    {AI_PROVIDER_LABELS[p]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {AI_SEARCH_QUERIES.map((query) => (
                <tr key={query} className="border-t align-top">
                  <td className="px-3 py-2 font-medium text-muted-foreground">
                    {query}
                  </td>
                  {AI_PROVIDERS.map((provider) => {
                    const cell = grid.get(query)?.get(provider);
                    return (
                      <td key={provider} className="px-3 py-2">
                        {renderCell(cell)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function renderCell(cell: QueryResult | undefined) {
  if (!cell) return <span className="text-muted-foreground">—</span>;
  if (cell.error) {
    return (
      <span className="text-xs text-red-600" title={cell.error}>
        error
      </span>
    );
  }
  if (cell.mentions.length === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">
        no tracked brands mentioned
      </span>
    );
  }
  return (
    <ol className="space-y-0.5 text-xs">
      {cell.mentions.map((brand, i) => {
        const isBehold = brand === "Behold Retreats";
        return (
          <li
            key={brand}
            className={cn(
              "flex items-baseline gap-1.5",
              isBehold && "font-semibold text-foreground",
              !isBehold && "text-muted-foreground",
            )}
          >
            <span className="tabular-nums opacity-60">{i + 1}.</span>
            <span>{brand}</span>
          </li>
        );
      })}
    </ol>
  );
}
