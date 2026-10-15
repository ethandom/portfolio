import "server-only";
import type { ActivityDay } from "@/lib/content";
import { byDate } from "../lib/calendar";

const TIMEOUT = 8000;

const GITHUB_QUERY = `query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar { weeks { contributionDays { date contributionCount } } }
    }
  }
}`;

/** Daily contribution counts from GitHub's GraphQL API; needs GITHUB_TOKEN. */
export async function fetchGitHub(
  login: string,
  from: string,
  to: string,
): Promise<ActivityDay[]> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set");

  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: GITHUB_QUERY,
      variables: { login, from: `${from}T00:00:00Z`, to: `${to}T23:59:59Z` },
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);

  const json = await res.json();
  const weeks =
    json?.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!Array.isArray(weeks))
    throw new Error(
      `GitHub returned no calendar: ${JSON.stringify(json?.errors ?? json)}`,
    );

  return byDate(
    weeks.flatMap(
      (w: {
        contributionDays: { date: string; contributionCount: number }[];
      }) =>
        w.contributionDays.map((d) => ({
          date: d.date,
          count: d.contributionCount,
        })),
    ),
  );
}

const LEETCODE_QUERY = `query($username: String!) {
  matchedUser(username: $username) { userCalendar { submissionCalendar } }
}`;

/**
 * Daily submission counts from LeetCode's public (undocumented) GraphQL
 * endpoint. Best effort: it can change or block without notice. Keys are
 * Unix seconds at UTC midnight, so the UTC date is the day.
 */
export async function fetchLeetCode(username: string): Promise<ActivityDay[]> {
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/${username}/`,
      "User-Agent": "ethanaustincruse.com activity",
    },
    body: JSON.stringify({ query: LEETCODE_QUERY, variables: { username } }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!res.ok) throw new Error(`LeetCode responded ${res.status}`);

  const json = await res.json();
  const raw = json?.data?.matchedUser?.userCalendar?.submissionCalendar;
  if (typeof raw !== "string") throw new Error("LeetCode returned no calendar");

  const calendar = JSON.parse(raw) as Record<string, number>;
  return byDate(
    Object.entries(calendar).map(([seconds, count]) => ({
      date: new Date(Number(seconds) * 1000).toISOString().slice(0, 10),
      count,
    })),
  );
}
