"use client";

import { Children, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/**
 * Mockup B's track: cards side by side, scrolling sideways inside their own
 * frame (never the page). Snap points, arrow buttons and a segment readout;
 * the track itself is focusable, so arrow keys scroll it.
 */
export function Rail({
  labels,
  children,
}: {
  /** One short name per card, for the segment readout. */
  labels: string[];
  children: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  const count = Children.count(children);

  function cards() {
    return [...(track.current?.children ?? [])] as HTMLElement[];
  }

  function onScroll() {
    const el = track.current;
    if (!el) return;
    const left = el.scrollLeft;
    // The card whose left edge is nearest the track's.
    const nearest = cards().reduce(
      (best, card, i) =>
        Math.abs(card.offsetLeft - el.offsetLeft - left) <
        Math.abs(cards()[best].offsetLeft - el.offsetLeft - left)
          ? i
          : best,
      0,
    );
    // At the very end, the last card can't reach the left edge.
    setAt(left + el.clientWidth >= el.scrollWidth - 4 ? count - 1 : nearest);
  }

  function go(i: number) {
    const el = track.current;
    const card = cards()[i];
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <div
        ref={track}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label="Work history, scrolls sideways"
        className="flex items-start snap-x snap-mandatory scroll-smooth gap-4 overflow-x-auto overscroll-x-contain pb-4 motion-reduce:scroll-auto [scrollbar-width:thin]"
      >
        {children}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <ol className="flex min-w-0 flex-1 gap-1" aria-label="Entries">
          {labels.map((label, i) => (
            <li key={label} className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === at ? "true" : undefined}
                className="group/seg grid w-full gap-1.5 text-left"
              >
                <span
                  className={cn(
                    "h-1 w-full transition-colors duration-(--dur-fast)",
                    i === at ? "bg-accent" : "bg-rule group-hover/seg:bg-ink-muted",
                  )}
                />
                <span
                  className={cn(
                    "truncate font-mono text-label uppercase",
                    i === at ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-2">
          <span className="font-mono text-label text-ink-muted uppercase">
            {String(at + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous entry"
            disabled={at === 0}
            onClick={() => go(at - 1)}
          >
            <ArrowLeftIcon weight="light" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next entry"
            disabled={at === count - 1}
            onClick={() => go(at + 1)}
          >
            <ArrowRightIcon weight="light" />
          </Button>
        </div>
      </div>
    </div>
  );
}
