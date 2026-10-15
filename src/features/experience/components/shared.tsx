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
 * The drawing behind each `figure` id in /content. Each one shows a past
 * role instead of telling it; the content names the chip that opens it.
 */
const FIGURES: Record<
  ExperienceFigure,
  (props: { number: number }) => ReactNode
> = {
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
}: {
  entry: Experience;
  number: number;
}) {
  return entryFigures(entry, number)[0]?.figure ?? null;
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

/** The core points, numbers marked. */
export function CorePoints({
  entry,
  className,
}: {
  entry: Experience;
  className?: string;
}) {
  return (
    <ul className={cn("grid gap-2", className)}>
      {entry.highlights.map((line) => (
        <li
          key={line}
          className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-2 text-base"
        >
          <span aria-hidden className="mt-2.5 size-1.5 bg-accent" />
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
    <ul aria-label="Tools" className={cn("flex flex-wrap gap-x-6 gap-y-3", className)}>
      {entry.stack.map((name) => (
        <li key={name} className="flex items-center gap-2">
          <StackMark name={name} className="size-9 [&_svg]:size-5" />
          <span className="font-mono text-label text-ink uppercase">{name}</span>
        </li>
      ))}
    </ul>
  );
}
