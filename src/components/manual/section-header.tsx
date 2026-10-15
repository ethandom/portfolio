import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * "01 — SPECIFICATIONS": a chapter rule in the manual.
 * The number is part of the heading, so the outline reads "01 Specifications".
 */
export function SectionHeader({
  index,
  title,
  meta,
  id,
  as: Heading = "h2",
  className,
}: {
  index: number;
  /** Plain text, or a <ScrambleText> of it. */
  title: ReactNode;
  /** Right-aligned running detail: an entry count, a revision, a link. */
  meta?: ReactNode;
  /** Heading id, for aria-labelledby on the section and in-page links. */
  id?: string;
  as?: "h2" | "h3";
  className?: string;
}) {
  return (
    <header
      className={cn(
        "relative flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pt-3",
        className,
      )}
    >
      {/* The chapter rule is its own element so motion.css can draw it on. */}
      <span aria-hidden data-rule className="absolute inset-x-0 top-0 h-px bg-strong" />
      <Heading
        id={id}
        className="flex items-baseline gap-3 font-mono text-sm font-medium tracking-[0.08em] text-ink uppercase"
      >
        <span className="flex items-center gap-2 text-ink-muted">
          <span aria-hidden className="size-1.5 -translate-y-px bg-accent" />
          {String(index).padStart(2, "0")}
        </span>
        <span aria-hidden className="text-rule">
          —
        </span>
        <span>{title}</span>
      </Heading>
      {meta && (
        <div className="font-mono text-label text-ink-muted uppercase">{meta}</div>
      )}
    </header>
  );
}
