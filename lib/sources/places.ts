import { cacheLife, cacheTag } from "next/cache";

export function isPlacesConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}

const COMPETITORS = [
  { name: "Behold Retreats", query: "Behold Retreats, Costa Rica" },
  { name: "Soltara Healing Center", query: "Soltara Healing Center, Costa Rica" },
  { name: "Rythmia Life Advancement Center", query: "Rythmia Life Advancement Center, Costa Rica" },
] as const;

export type CompetitorReputation = {
  name: string;
  rating: number | null;
  reviewCount: number | null;
};

type SearchTextResponse = {
  places?: { rating?: number; userRatingCount?: number }[];
};

async function lookupOne(
  apiKey: string,
  query: string,
): Promise<{ rating: number | null; reviewCount: number | null }> {
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.rating,places.userRatingCount",
    },
    body: JSON.stringify({ textQuery: query }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Places API ${res.status}: ${body.slice(0, 200) || res.statusText}`,
    );
  }

  const data = (await res.json()) as SearchTextResponse;
  const top = data.places?.[0];
  return {
    rating: top?.rating ?? null,
    reviewCount: top?.userRatingCount ?? null,
  };
}

async function fetchCompetitorReputation(): Promise<CompetitorReputation[]> {
  "use cache: remote";
  cacheLife("weekly");
  cacheTag("places");

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Google Places is not configured");
  }

  return Promise.all(
    COMPETITORS.map(async (c) => {
      const result = await lookupOne(apiKey, c.query);
      return { name: c.name, ...result };
    }),
  );
}

export const getCompetitorReputation = fetchCompetitorReputation;
