import type { ReactNode } from "react";
import { SpecLabel, StackMark } from "@/components/manual";
import {
  formatPeriod,
  type Experience,
  type ExperienceFigure,
  type Period,
} from "@/lib/content";
import { cn } from "@/lib/cn";
import { DescentFigure } from "./descent-figure";
import { WorkflowFigure } from "./workflow-figure";

/** Entry number inside a chapter: entry 1 of chapter 3 is "03.1". */
export function entryNo(chapter: number, index: number) {
  return `${String(chapter).padStart(2, "0")}.${index + 1}`;
}

/** "2 mos", "1 yr 1 mo". Open periods already read "Present", so they get none. */
export function tenure({ start, end }: Period) {
  if (!end) return null;
  const [sy, sm] = start.split("-").map(Number);
  const [ey, em] = end.split("-").map(Number);
  const months = (ey - sy) * 12 + (em - sm) + 1;
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y) parts.push(`${y} yr`);
  if (m) parts.push(`${m} mo${m > 1 ? "s" : ""}`);
  return parts.join(" ");
}

/** Figures, ratios and counts: "150k+", "100x", "500k–650k", "200+". */
const FIGURE = /(\d[\d,.]*[kKM]?(?:–\d[\d,.]*[kKM]?)?\+?x?)(?=\W|$)/g;

/** Sets a highlight line with its numbers underlined in highlight yellow, so the eye lands on them first. */
export function Emphasis({ text }: { text: string }) {
  const parts = text.split(FIGURE);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark
        key={i}
        className="bg-transparent font-medium text-ink underline decoration-highlight decoration-2 underline-offset-[0.25em]"
      >
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

/**
 * What a figure takes. `compact`: it sits in a narrow column (the
 * Workbench's panels), so it shrinks to fit instead of scrolling; figures
 * that already fit ignore it.
 */
type FigureProps = { number: number; compact?: boolean };

/**
 * The drawing behind each `figure` id in /content. Each one shows a past
 * role instead of telling it; the content names the chip that opens it.
 */
const FIGURES: Record<ExperienceFigure, (props: FigureProps) => ReactNode> = {
  "gradient-descent": DescentFigure,
  "data-pipeline": WorkflowFigure,
};

/** The entry's figures, numbered from `first`. */
export function entryFigures(entry: Experience, first: number) {
  if (!entry.figure) return [];
  const Fig = FIGURES[entry.figure.id];
  return [{ chip: entry.figure.title, figure: <Fig number={first} /> }];
}

export function figureCount(entry: Experience) {
  return entry.figure ? 1 : 0;
}

/** The entry's lead figure (the rail shows one per card). */
export function EntryFigure({
  entry,
  number,
  compact,
}: {
  entry: Experience;
  number: number;
  compact?: boolean;
}) {
  if (!entry.figure) return null;
  const Fig = FIGURES[entry.figure.id];
  return <Fig number={number} compact={compact} />;
}

/** Period, then how long: "Jan 2024 – Feb 2024 · 2 mos". */
export function PeriodLine({ entry }: { entry: Experience }) {
  return (
    <SpecLabel className="whitespace-nowrap">
      {[formatPeriod(entry.period), tenure(entry.period)]
        .filter(Boolean)
        .join(" · ")}
    </SpecLabel>
  );
}

/** The core points, numbers marked. `size="sm"` sets them small, for narrow panels. */
export function CorePoints({
  entry,
  size = "base",
  className,
}: {
  /** An experience entry, or anything with highlights (a project). */
  entry: Pick<Experience, "highlights">;
  size?: "base" | "sm";
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-2", className)}>
      {entry.highlights.map((line) => (
        <li
          key={line}
          className={cn(
            "grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2",
            size === "sm" ? "text-sm/normal" : "text-base",
          )}
        >
          <span
            aria-hidden
            // The square sits on the first line's center.
            className={cn(
              "size-1.5 bg-accent",
              size === "sm" ? "mt-2" : "mt-2.5",
            )}
          />
          <span className="max-w-(--measure)">
            <Emphasis text={line} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** The tools used in the role, as brand keycaps under what was done with them. */
export function Tools({
  entry,
  className,
}: {
  entry: Experience;
  className?: string;
}) {
  if (entry.stack.length === 0) return null;
  return (
    // A grid, not flex-wrap, so the keycaps line up in columns at every width.
    <ul
      aria-label="Tools"
      className={cn(
        "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {entry.stack.map((name) => (
        <li key={name} className="flex min-w-0 items-center gap-2">
          <StackMark name={name} className="size-9 [&_svg]:size-5" />
          <span className="min-w-0 font-mono text-label break-words text-ink uppercase">
            {name}
          </span>
        </li>
      ))}
    </ul>
  );
}
