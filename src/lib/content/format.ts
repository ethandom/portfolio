import type { Period } from "./schemas";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-02" → "Feb 2026" */
export function formatYearMonth(ym: string): string {
  const [year, month] = ym.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** "Oct 2025 – Dec 2025", "Feb 2026 – Present", or "Feb 2026" for one month. */
export function formatPeriod({ start, end }: Period): string {
  if (end === start) return formatYearMonth(start);
  return `${formatYearMonth(start)} – ${end ? formatYearMonth(end) : "Present"}`;
}
