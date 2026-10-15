import type { ActivityDay } from "@/lib/content";

/** Days are counted on Atlanta time, so "today" matches where Ethan is. */
export const TIME_ZONE = "America/New_York";

/** "YYYY-MM-DD" for an instant, in TIME_ZONE. */
export function localDate(at: Date, timeZone = TIME_ZONE): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(at);
}

/** Calendar arithmetic on "YYYY-MM-DD" strings, done in UTC so DST can't skew it. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Sunday, as GitHub's calendar starts its weeks. */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

export type Cell = {
  date: string;
  github: number;
  leetcode: number;
  /** After today: drawn empty, never counted. */
  future: boolean;
};

/**
 * The last `weeks` calendar weeks ending with the week that holds `today`,
 * Sunday first, as rows of 7 cells.
 */
export function buildWeeks(
  today: string,
  weeks: number,
  github: readonly ActivityDay[],
  leetcode: readonly ActivityDay[],
): Cell[][] {
  const gh = new Map(github.map((d) => [d.date, d.count]));
  const lc = new Map(leetcode.map((d) => [d.date, d.count]));
  const start = addDays(today, -weekday(today) - 7 * (weeks - 1));

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(start, w * 7 + d);
      const future = date > today;
      return {
        date,
        future,
        github: future ? 0 : (gh.get(date) ?? 0),
        leetcode: future ? 0 : (lc.get(date) ?? 0),
      };
    }),
  );
}

/** 0–4 on the orange ramp; thresholds suit a person's daily counts. */
export function level(count: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

/** Merge per-day entries that share a date (LeetCode can report two stamps a day). */
export function byDate(days: Iterable<ActivityDay>): ActivityDay[] {
  const totals = new Map<string, number>();
  for (const { date, count } of days)
    totals.set(date, (totals.get(date) ?? 0) + count);
  return [...totals]
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
