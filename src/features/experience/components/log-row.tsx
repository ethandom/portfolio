"use client";

import { useId, useState, type ReactNode } from "react";
import { PlusIcon } from "@phosphor-icons/react";

/**
 * One service-log row. The figure chips sit level with the tools, under the
 * role, but a figure opens across the whole row, so this can't be a <details>.
 * One figure shows at a time: a second chip swaps it, the open chip closes it.
 * Panels stay mounted (inert while hidden), so figures keep their state.
 */
export function LogRow({
  meta,
  points,
  tools,
  figures = [],
  labelledBy,
}: {
  meta: ReactNode;
  points: ReactNode;
  /** The tools row; the figure chips line up beside it. */
  tools?: ReactNode;
  figures?: { chip: string; figure: ReactNode }[];
  labelledBy: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  // The last figure opened stays in place while the panel folds shut.
  const [shown, setShown] = useState(0);
  const panel = useId();

  function toggle(i: number) {
    if (open === i) return setOpen(null);
    setOpen(i);
    setShown(i);
  }

  return (
    <article
      aria-labelledby={labelledBy}
      className="grid grid-cols-1 gap-x-8 gap-y-4 py-6 md:grid-cols-[18rem_minmax(0,1fr)]"
    >
      <div className="grid content-start">{meta}</div>
      <div className="grid min-w-0 grid-cols-1 content-start gap-4">{points}</div>
      {tools && <div className="min-w-0 self-center md:col-start-2 md:row-start-2">{tools}</div>}
      {figures.length > 0 && (
        <div className="flex flex-wrap gap-2 self-center md:col-start-1 md:row-start-2">
          {figures.map(({ chip }, i) => (
            <button
              key={chip}
              type="button"
              aria-expanded={open === i}
              aria-controls={`${panel}-${i}`}
              onClick={() => toggle(i)}
              className="group/fig inline-flex h-9 items-center gap-2 border border-accent bg-surface px-3 font-mono text-label whitespace-nowrap text-ink uppercase transition-colors duration-(--dur-fast) ease-out hover:bg-sunken aria-expanded:bg-sunken"
            >
              <PlusIcon
                weight="light"
                className="size-3.5 text-accent-text transition-transform duration-(--dur-base) ease-snap group-aria-expanded/fig:rotate-45"
              />
              {chip}
            </button>
          ))}
        </div>
      )}
      {figures.length > 0 && (
        <div
          inert={open === null}
          className="grid grid-cols-1 transition-[grid-template-rows] duration-(--dur-slow) ease-out md:col-span-2 md:row-start-3"
          style={{ gridTemplateRows: open !== null ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            {figures.map(({ chip, figure }, i) => (
              <div
                key={chip}
                id={`${panel}-${i}`}
                hidden={shown !== i}
                className="grid grid-cols-1 pt-2"
              >
                {figure}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
