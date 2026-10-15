import type { ReactNode } from "react";
import { SpecLabel } from "@/components/manual";
import type { Experience } from "@/lib/content";
import { cn } from "@/lib/cn";
import { CorePoints, PeriodLine, entryNo } from "./shared";

/** One car on the rail: a log card with its figure under the core points. */
export function RailCard({
  entry,
  index,
  wide = false,
  status,
  children,
}: {
  entry: Experience;
  index: number;
  /** The current role takes two cars' width on wide screens. */
  wide?: boolean;
  status?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article
      aria-labelledby={`rail-${entry.slug}`}
      className={cn(
        "grid w-[min(100%,34rem)] shrink-0 snap-start grid-cols-1 content-start border border-strong bg-surface",
        wide && "lg:w-[min(100%,60rem)] lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]",
      )}
    >
      <div className="flex min-w-0 flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <SpecLabel tone="inverse">{entryNo(index)}</SpecLabel>
          {status}
          <PeriodLine entry={entry} />
        </div>
        <div>
          <h3 id={`rail-${entry.slug}`} className="text-xl font-medium">
            {entry.org}
          </h3>
          <SpecLabel as="p" tone="ink" className="mt-1">
            {entry.role}
          </SpecLabel>
        </div>
        <CorePoints entry={entry} className="border-t border-strong pt-4" />
      </div>
      <div
        className={cn(
          "grid min-w-0 grid-cols-1 content-start border-t border-hairline bg-sunken p-3",
          wide && "lg:border-t-0 lg:border-l",
        )}
      >
        {children}
      </div>
    </article>
  );
}
