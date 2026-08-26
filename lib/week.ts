/**
 * Shared week anchoring for everything that regenerates "once a week."
 *
 * Passing the current week's Monday into a cached function makes it part of
 * the cache key, which pins regeneration to the calendar week rather than
 * to "7 days after whenever it last happened to run." Without this, a
 * generation that fires on a Wednesday keeps landing on Wednesdays and the
 * report quietly drifts away from the Monday review cadence.
 *
 * Anchored to Europe/Lisbon since that's where the weekly review happens.
 */

const REPORT_TIMEZONE = "Europe/Lisbon";

/**
 * Monday of the current week, as a wall-clock date in REPORT_TIMEZONE.
 * Not cached — call this OUTSIDE any "use cache" scope (it reads the clock)
 * and pass the result in as an argument.
 */
export function getCurrentWeekStart(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  const y = get("year");
  const m = get("month");
  const d = get("day");
  const weekdayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
    get("weekday"),
  );

  const date = new Date(`${y}-${m}-${d}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - weekdayIndex);
  return date.toISOString().slice(0, 10);
}

/** e.g. "Aug 24 – Aug 30" for display alongside weekly-generated content. */
export function weekRangeLabel(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(start)} – ${fmt(end)}`;
}
