import { SpecLabel } from "@/components/manual";
import type { Experience } from "@/lib/content";
import { LogRow } from "./log-row";
import { CorePoints, PeriodLine, Tools, entryFigures, figureCount } from "./shared";

/**
 * Mockup A's log: one row per past role. The core points and tools always
 * show; each figure folds out from its chip under the role.
 */
export function ServiceLog({
  entries,
  firstFigure,
}: {
  entries: Experience[];
  firstFigure: number;
}) {
  return (
    <ol className="border-t border-strong">
      {entries.map((entry, i) => (
        <li key={entry.slug} className="border-b border-strong">
          <LogRow
            labelledBy={`log-${entry.slug}`}
            meta={
              <>
                {/* Apprenticeships read as one line, "Apprentice to Google VP". */}
                <h3 id={`log-${entry.slug}`} className="text-lg font-medium md:whitespace-nowrap">
                  {entry.relation && entry.mentor
                    ? `${entry.relation} ${entry.mentor}`
                    : entry.org}
                </h3>
                <SpecLabel as="p" tone="ink" className="mt-1.5">
                  {entry.role}
                </SpecLabel>
                <div className="mt-2">
                  <PeriodLine entry={entry} />
                </div>
              </>
            }
            points={<CorePoints entry={entry} />}
            tools={entry.stack.length > 0 ? <Tools entry={entry} /> : undefined}
            // Figures number on from the rows before; a row can hold several.
            figures={entryFigures(
              entry,
              firstFigure + entries.slice(0, i).reduce((sum, e) => sum + figureCount(e), 0),
            )}
          />
        </li>
      ))}
    </ol>
  );
}
