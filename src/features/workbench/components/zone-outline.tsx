import type { Ref } from "react";
import { cn } from "@/lib/cn";

/** Faint diagonal hatching inside the outline. */
const HATCH =
  "repeating-linear-gradient(-45deg, color-mix(in oklab, var(--ink) 9%, transparent) 0 1px, transparent 1px 8px)";

/** A small "+" centered on one corner of the outline. */
function Tick({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute size-[11px] -translate-x-1/2 -translate-y-1/2",
        "before:absolute before:top-1/2 before:left-0 before:h-px before:w-full before:bg-ink",
        "after:absolute after:top-0 after:left-1/2 after:h-full after:w-px after:bg-ink",
        className,
      )}
    />
  );
}

/**
 * The hover frame around a zone: a hairline box with corner ticks, hatched
 * inside, and "[Go to …]". The scene positions and sizes it every frame
 * (straight on the element, through `ref`); hidden until it does.
 */
export function ZoneOutline({
  ref,
  label,
}: {
  ref: Ref<HTMLDivElement>;
  label: string | null;
}) {
  return (
    <div
      ref={ref}
      aria-hidden
      style={{ backgroundImage: HATCH }}
      className="pointer-events-none absolute top-0 left-0 hidden border border-ink/70"
    >
      <Tick className="top-0 left-0" />
      <Tick className="top-0 left-full" />
      <Tick className="top-full left-0" />
      <Tick className="top-full left-full" />
      {label && (
        <span className="absolute top-1/2 left-[54%] -translate-y-1/2 font-mono text-label whitespace-nowrap text-ink uppercase">
          [Go to {label}]
        </span>
      )}
    </div>
  );
}
