"use client";

import { useState, type CSSProperties } from "react";
import { Figure } from "@/components/manual";
import { ScrambleText } from "@/components/motion";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ActivitySource } from "@/lib/content";
import { cn } from "@/lib/cn";
import { level, type Cell } from "../lib/calendar";

const RAMP = [0, 25, 50, 75, 100];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const long = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const short = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const at = (date: string) => new Date(`${date}T00:00:00Z`);

function count(cell: Cell, source: ActivitySource) {
  if (source === "github") return cell.github;
  if (source === "leetcode") return cell.leetcode;
  return cell.github + cell.leetcode;
}

function describe(cell: Cell, hasLeetCode: boolean) {
  const day = long.format(at(cell.date));
  if (cell.future) return `${day}: not yet`;
  const parts = [`GitHub ${cell.github}`];
  if (hasLeetCode) parts.push(`LeetCode ${cell.leetcode}`);
  return `${day}: ${parts.join(", ")}`;
}

/**
 * A short calendar, weeks as rows and Sunday first, each day a square on the
 * orange ramp. The switch re-reads the same days from another source; the
 * cells re-level left to right, one day every 15ms.
 */
export function ActivityCalendar({
  weeks,
  today,
  hasLeetCode,
  defaultSource,
  snapshot,
}: {
  weeks: Cell[][];
  today: string;
  hasLeetCode: boolean;
  defaultSource: ActivitySource;
  /** Sources that fell back to the committed snapshot. */
  snapshot: string[];
}) {
  const [source, setSource] = useState<ActivitySource>(
    hasLeetCode ? defaultSource : "github",
  );
  const days = weeks.flat().filter((c) => !c.future);
  const total = days.reduce((sum, c) => sum + count(c, source), 0);
  const active = days.filter((c) => count(c, source) > 0).length;
  const range = `${short.format(at(weeks[0][0].date))} – ${short.format(at(today))}`;

  return (
    <Figure
      number={4}
      title={`Activity · last ${weeks.length} weeks`}
      grid={false}
      bodyClassName="px-4 py-6 sm:px-8"
      meta={
        hasLeetCode && (
          <ToggleGroup
            type="single"
            size="sm"
            value={source}
            onValueChange={(v) => v && setSource(v as ActivitySource)}
            aria-label="Activity source"
          >
            <ToggleGroupItem value="both">Both</ToggleGroupItem>
            <ToggleGroupItem value="github">GitHub</ToggleGroupItem>
            <ToggleGroupItem value="leetcode">LeetCode</ToggleGroupItem>
          </ToggleGroup>
        )
      }
      note={
        <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span>
            {range}. Active {active} of {days.length} days.
            {snapshot.length > 0 &&
              ` ${snapshot.join(" and ")} from the saved snapshot.`}
          </span>
          <span className="font-mono text-label uppercase">
            Total <ScrambleText text={String(total).padStart(3, "0")} />
          </span>
        </span>
      }
    >
      <div className="mx-auto grid max-w-xl grid-cols-[auto_repeat(7,minmax(0,1fr))] gap-1.5">
        <span aria-hidden />
        {WEEKDAYS.map((d) => (
          <span
            key={d}
            aria-hidden
            className="pb-1 text-center font-mono text-label text-ink-muted uppercase"
          >
            {d.slice(0, 1)}
            <span className="hidden sm:inline">{d.slice(1)}</span>
          </span>
        ))}

        {weeks.map((week, w) => (
          <ol
            key={week[0].date}
            aria-label={`Week of ${short.format(at(week[0].date))}`}
            className="contents"
          >
            <li
              aria-hidden
              className="self-center pr-2 font-mono text-label whitespace-nowrap text-ink-muted uppercase"
            >
              {short.format(at(week[0].date))}
            </li>
            {week.map((cell, d) => {
              const n = count(cell, source);
              const lv = level(n);
              const style = {
                backgroundColor: cell.future
                  ? "transparent"
                  : `color-mix(in oklab, var(--accent) ${RAMP[lv]}%, var(--sunken))`,
                transition: "background-color var(--dur-base) var(--ease-out)",
                transitionDelay: `calc(${(w * 7 + d) * 15}ms * var(--motion-scale))`,
              } as CSSProperties;
              return (
                <Tooltip key={cell.date}>
                  <TooltipTrigger asChild>
                    <li
                      tabIndex={0}
                      aria-label={describe(cell, hasLeetCode)}
                      style={style}
                      className={cn(
                        "relative aspect-square min-w-0 p-1 font-mono text-[0.6875rem] leading-none outline-offset-2",
                        cell.future && "border border-dashed border-hairline",
                        cell.date === today &&
                          "ring-1 ring-strong ring-offset-2 ring-offset-surface",
                        lv >= 2 ? "text-(--tape-ink)" : "text-ink-muted",
                      )}
                    >
                      <span aria-hidden>{at(cell.date).getUTCDate()}</span>
                      {n > 0 && (
                        <span
                          aria-hidden
                          className="absolute right-1 bottom-1 tabular-nums"
                        >
                          {n}
                        </span>
                      )}
                    </li>
                  </TooltipTrigger>
                  <TooltipContent>{describe(cell, hasLeetCode)}</TooltipContent>
                </Tooltip>
              );
            })}
          </ol>
        ))}
      </div>
    </Figure>
  );
}
