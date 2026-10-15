import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SpecRow = { label: string; value: string; note?: string };

/**
 * A datasheet table: parameter, value, conditions.
 * Values are measurements, so they set in mono with tabular figures.
 * Below `sm` the notes column folds under the parameter.
 */
export function SpecTable({
  rows,
  caption,
  headers = { label: "Parameter", value: "Value", note: "Notes" },
  renderValue = (row) => row.value,
  className,
}: {
  rows: readonly SpecRow[];
  /** Visible table title, e.g. "Table 1 — Key figures". */
  caption?: string;
  headers?: { label: string; value: string; note: string };
  /** Wrap the value, e.g. in a <CountUp>. The text itself still comes from `row.value`. */
  renderValue?: (row: SpecRow) => ReactNode;
  className?: string;
}) {
  const hasNotes = rows.some((row) => row.note);

  return (
    <table className={cn("w-full border-collapse text-left", className)}>
      {caption && (
        <caption className="caption-top pb-2 text-left font-mono text-label text-ink-muted uppercase">
          {caption}
        </caption>
      )}
      <thead>
        <tr className="border-b border-strong font-mono text-label text-ink-muted uppercase">
          <th scope="col" className="py-2 pr-4 font-normal">
            {headers.label}
          </th>
          <th scope="col" className="py-2 pr-4 text-right font-normal sm:text-left">
            {headers.value}
          </th>
          {hasNotes && (
            <th scope="col" className="hidden py-2 font-normal sm:table-cell">
              {headers.note}
            </th>
          )}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className="border-b border-hairline align-baseline last:border-strong"
          >
            <th scope="row" className="py-3 pr-4 font-normal">
              <span className="block text-base text-ink">{row.label}</span>
              {row.note && (
                <span className="mt-0.5 block text-sm text-ink-muted sm:hidden">
                  {row.note}
                </span>
              )}
            </th>
            <td className="py-3 pr-0 text-right font-mono text-lg whitespace-nowrap text-ink tabular-nums sm:pr-4 sm:text-left">
              {renderValue(row)}
            </td>
            {hasNotes && (
              <td className="hidden py-3 text-sm text-ink-muted sm:table-cell">
                {row.note}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
