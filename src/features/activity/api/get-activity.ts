import "server-only";
import { cacheLife } from "next/cache";
import {
  getActivitySnapshot,
  getProfile,
  type ActivityDay,
} from "@/lib/content";
import { addDays, localDate } from "../lib/calendar";
import { fetchGitHub, fetchLeetCode } from "./sources";

export type SourceData = {
  days: ActivityDay[];
  /** "live" from the API, or the committed snapshot when the API failed. */
  from: "live" | "snapshot";
};

export type Activity = {
  /** Today in Atlanta, "YYYY-MM-DD"; the calendar ends on this day's week. */
  today: string;
  github: SourceData;
  leetcode?: SourceData;
};

/**
 * A year of daily activity from both sources, cached for an hour so the
 * window rolls over with the day. Each source falls back to
 * content/activity.snapshot.json on its own, so one outage never blanks
 * the other.
 */
export async function getActivity(): Promise<Activity> {
  "use cache";
  cacheLife("hours");

  const { activity } = getProfile();
  const today = localDate(new Date());
  const from = addDays(today, -365);
  const snapshot = getActivitySnapshot();

  const [github, leetcode] = await Promise.allSettled([
    fetchGitHub(activity.github, from, today),
    activity.leetcode
      ? fetchLeetCode(activity.leetcode)
      : Promise.reject(new Error("no username")),
  ]);

  const pick = (
    result: PromiseSettledResult<ActivityDay[]>,
    fallback: ActivityDay[],
    name: string,
  ): SourceData => {
    if (result.status === "fulfilled")
      return { days: result.value, from: "live" };
    console.warn(
      `[activity] ${name} fell back to the snapshot:`,
      result.reason,
    );
    return { days: fallback, from: "snapshot" };
  };

  return {
    today,
    github: pick(github, snapshot.github, "GitHub"),
    leetcode: activity.leetcode
      ? pick(leetcode, snapshot.leetcode, "LeetCode")
      : undefined,
  };
}
