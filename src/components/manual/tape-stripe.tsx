import { cn } from "@/lib/cn";

/**
 * Caution tape: the hard edge between the manual and the dark footer.
 * An optional plate prints a word on the tape, e.g. "End of manual".
 */
export function TapeStripe({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role={label ? undefined : "presentation"}
      className={cn("relative h-3 w-full bg-tape", label && "h-6", className)}
    >
      {label && (
        <span className="absolute inset-y-0 left-[var(--gutter)] flex items-center bg-[var(--tape-ink)] px-2 font-mono text-label font-medium text-highlight uppercase">
          {label}
        </span>
      )}
    </div>
  );
}
