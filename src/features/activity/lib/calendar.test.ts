import { describe, expect, it } from "vitest";
import {
  addDays,
  buildWeeks,
  byDate,
  level,
  localDate,
  weekday,
} from "./calendar";

describe("activity calendar", () => {
  it("does date math across month and DST boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-08", -1)).toBe("2026-03-07");
    expect(weekday("2026-10-11")).toBe(0); // a Sunday
  });

  it("reads today in Atlanta time, not UTC", () => {
    // 02:00 UTC on Oct 16 is still Oct 15 in Atlanta.
    expect(localDate(new Date("2026-10-16T02:00:00Z"))).toBe("2026-10-15");
  });

  it("builds Sunday-first weeks ending with today's week", () => {
    const weeks = buildWeeks(
      "2026-10-15",
      2,
      [{ date: "2026-10-12", count: 3 }],
      [
        { date: "2026-10-12", count: 2 },
        { date: "2026-10-16", count: 9 },
      ],
    );
    expect(weeks).toHaveLength(2);
    expect(weeks[0][0].date).toBe("2026-10-04");
    expect(weeks[1][6].date).toBe("2026-10-17");
    const mon = weeks[1][1];
    expect([mon.date, mon.github, mon.leetcode]).toEqual(["2026-10-12", 3, 2]);
    // Days after today are empty, even if a source reports them.
    expect(weeks[1][5]).toMatchObject({
      date: "2026-10-16",
      future: true,
      leetcode: 0,
    });
  });

  it("levels counts onto the 0–4 ramp", () => {
    expect([0, 1, 3, 6, 12].map(level)).toEqual([0, 1, 2, 3, 4]);
  });

  it("merges entries that share a date", () => {
    expect(
      byDate([
        { date: "2026-10-02", count: 1 },
        { date: "2026-10-01", count: 2 },
        { date: "2026-10-02", count: 3 },
      ]),
    ).toEqual([
      { date: "2026-10-01", count: 2 },
      { date: "2026-10-02", count: 4 },
    ]);
  });
});
