import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const corner = "pointer-events-none absolute size-2.5 border-strong";

/**
 * "Fig. N": a drafting frame on a blueprint grid.
 * The title strip is the figcaption; `note` adds a longer caption below.
 */
export function Figure({
  number,
  title,
  meta,
  note,
  scroll = false,
  grid = true,
  children,
  className,
  bodyClassName,
}: {
  number: number;
  title: string;
  /** Right side of the title strip: scale, units, a source toggle. */
  meta?: ReactNode;
  note?: ReactNode;
  /** Let wide content (the heatmap) scroll inside the frame on phones. */
  scroll?: boolean;
  grid?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <figure className={cn("min-w-0 border border-strong bg-surface", className)}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-hairline px-3 py-2">
        <figcaption className="flex items-center gap-3 font-mono text-label uppercase">
          <span className="bg-inverse px-1.5 py-0.5 text-ink-inverse">Fig. {number}</span>
          <span className="text-ink">{title}</span>
        </figcaption>
        {meta && (
          <div className="font-mono text-label text-ink-muted uppercase">{meta}</div>
        )}
      </div>
      <div className={cn("relative", grid && "bg-blueprint")}>
        <span aria-hidden className={cn(corner, "top-2 left-2 border-t border-l")} />
        <span aria-hidden className={cn(corner, "top-2 right-2 border-t border-r")} />
        <span aria-hidden className={cn(corner, "bottom-2 left-2 border-b border-l")} />
        <span aria-hidden className={cn(corner, "right-2 bottom-2 border-r border-b")} />
        <div
          className={cn(
            "px-6 py-8 sm:px-10",
            scroll && "overflow-x-auto overscroll-x-contain",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </div>
      {note && (
        <div className="border-t border-hairline px-3 py-2 text-sm text-ink-muted">
          {note}
        </div>
      )}
    </figure>
  );
}
