/**
 * Weekly ad spend, hardcoded. Both channels here are stable, steady budgets
 * Andra doesn't change often, and the underlying platforms either don't
 * have accessible APIs (Costa Rica News runs X Ads from their own account
 * on Behold's behalf) or aren't worth the OAuth dance for a fixed number
 * (Bing / Microsoft Advertising). Change these constants when the budgets
 * shift; no runtime storage involved.
 *
 * Baselines confirmed 2026-08-11:
 *   Bing:    Microsoft Advertising monthly view showed ~$86 over 11 days
 *            of the month → ~$55/week.
 *   CR News: X Ads Manager (CR News account) showed $118.60 over 10 days
 *            of Aug → ~$85/week, running steady on Behold-branded article
 *            promotion campaigns.
 */

export const BING_WEEKLY_SPEND_USD = 55;
export const CR_NEWS_WEEKLY_SPEND_USD = 85;
export const TOTAL_WEEKLY_SPEND_USD =
  BING_WEEKLY_SPEND_USD + CR_NEWS_WEEKLY_SPEND_USD;

export type WeeklySpend = {
  bing: number;
  crNews: number;
  total: number;
};

/**
 * Reads as an async function so callers stay unchanged if this ever moves
 * back to a database — but today it's a pure constant.
 */
export function getWeeklySpend(): WeeklySpend {
  return {
    bing: BING_WEEKLY_SPEND_USD,
    crNews: CR_NEWS_WEEKLY_SPEND_USD,
    total: TOTAL_WEEKLY_SPEND_USD,
  };
}
