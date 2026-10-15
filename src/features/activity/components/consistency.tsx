import { SectionHeader } from "@/components/manual";
import { Reveal, ScrambleText } from "@/components/motion";
import { getProfile } from "@/lib/content";
import { getActivity } from "../api/get-activity";
import { buildWeeks } from "../lib/calendar";
import { ActivityCalendar } from "./activity-calendar";

/**
 * "Consistency Is Key": recent GitHub and LeetCode activity as a short
 * calendar. `weeks` sets the window; it ends with the current week.
 */
export async function Consistency({
  chapter,
  weeks,
}: {
  chapter: number;
  weeks: number;
}) {
  const { activity } = getProfile();
  const data = await getActivity();
  const calendar = buildWeeks(
    data.today,
    weeks,
    data.github.days,
    data.leetcode?.days ?? [],
  );
  const snapshot = [
    data.github.from === "snapshot" && "GitHub",
    data.leetcode?.from === "snapshot" && "LeetCode",
  ].filter((s): s is string => Boolean(s));

  return (
    <section
      id="activity"
      aria-labelledby="activity-h"
      className="grid scroll-mt-8 grid-cols-1 gap-8"
    >
      <Reveal variant="rules">
        <SectionHeader
          index={chapter}
          id="activity-h"
          title={<ScrambleText text="Consistency Is Key" />}
        />
      </Reveal>
      <ActivityCalendar
        weeks={calendar}
        today={data.today}
        hasLeetCode={Boolean(data.leetcode)}
        defaultSource={activity.defaultSource}
        snapshot={snapshot}
      />
    </section>
  );
}
