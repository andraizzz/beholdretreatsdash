/**
 * Case-insensitive brand-name scan for AI-generated response text. Returns
 * canonical brand names in the order they first appear in the text — this
 * gives us "who does ChatGPT mention first when asked X?" as a proxy for
 * recommendation position.
 */

export type Brand = {
  /** Display name used in the UI table + AI insights prompt. */
  canonical: string;
  /** All lowercase substrings that should count as a mention. Include
   *  common typos and abbreviated forms. */
  patterns: string[];
};

export const TRACKED_BRANDS: Brand[] = [
  {
    canonical: "Behold Retreats",
    patterns: ["behold retreat", "beholdretreats", "behold-retreats"],
  },
  {
    canonical: "Soltara",
    patterns: ["soltara"],
  },
  {
    canonical: "Rythmia",
    // Common typo: "Rhythmia" (extra h). Include so we don't miss a mention.
    patterns: ["rythmia", "rhythmia"],
  },
  {
    canonical: "New Life Rising",
    patterns: ["new life rising", "newliferising"],
  },
  {
    canonical: "Posada Natura",
    patterns: ["posada natura", "posadanatura"],
  },
  {
    canonical: "Florestral",
    patterns: ["florestral"],
  },
];

/**
 * Scan `text` for brand mentions. Returns canonical names in the order they
 * first appear. Each brand is counted once even if it appears multiple times.
 */
export function detectBrandMentions(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found: { brand: string; pos: number }[] = [];

  for (const brand of TRACKED_BRANDS) {
    let firstPos = -1;
    for (const pattern of brand.patterns) {
      const p = lower.indexOf(pattern);
      if (p !== -1 && (firstPos === -1 || p < firstPos)) {
        firstPos = p;
      }
    }
    if (firstPos !== -1) {
      found.push({ brand: brand.canonical, pos: firstPos });
    }
  }

  return found.sort((a, b) => a.pos - b.pos).map((f) => f.brand);
}
