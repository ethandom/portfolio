"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { Kbd, Led } from "@/components/manual";
import {
  prefersReducedMotion,
  timeScale,
} from "@/components/motion/preference";
import { cn } from "@/lib/cn";
import { duration, ease } from "@/lib/motion/presets";
import type { PanelContent } from "../lib/panels";

/** Below `md` the panel is a sheet over the bottom of the scene. */
const NARROW = "(max-width: 767.98px)";

/** Where the panel slides in from: its docked edge. */
function nudge(px: number, side: "left" | "right") {
  return window.matchMedia(NARROW).matches
    ? `translateY(${px}px)`
    : `translateX(${side === "left" ? -px : px}px)`;
}

/**
 * The overlay docked over the scene while a panel is open: a slip of the
 * manual clipped to the glass, top right (or top left, `side`), small enough
 * that the room stays the picture. Translucent Night Shift paper, one ink frame, the kicker and
 * title as a running head with the Esc key, and the body scrolling inside.
 *
 * Non-modal: a labelled dialog that takes focus when it opens (without
 * scrolling anything; `takeFocus` false leaves it where it is) and gives it
 * back when it closes, but never traps it and never blocks the scene. Esc
 * and clicks on empty space are the app's.
 * On close the last content stays printed while the panel fades out.
 *
 * `content` null = closed.
 */
export function StationPanel({
  content,
  onClose,
  side = "right",
  takeFocus = true,
}: {
  content: PanelContent | null;
  onClose: () => void;
  side?: "left" | "right";
  takeFocus?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const titleId = useId();
  // What the panel shows: the open content, or the last one while it leaves.
  const [shown, setShown] = useState(content);
  if (content && content !== shown) setShown(content);
  const leaving = !content && shown !== null;
  // The edge it's docked to: the open panel's, kept while the last one
  // leaves (the app's side falls back to "right" the moment it closes, which
  // jumped a closing left panel across the screen).
  const [dock, setDock] = useState(side);
  if (content && side !== dock) setDock(side);
  // Where focus was before the panel took it.
  const restore = useRef<HTMLElement | null>(null);
  // The running entrance; a quick swap replaces it rather than stacking.
  const entrance = useRef<Animation | null>(null);

  // Open, or swap to another panel: take focus, slide in from the edge.
  // Keyed on the title, so the same panel sent again (a refresh) stays put.
  const opened = content?.title ?? null;
  useLayoutEffect(() => {
    const el = ref.current;
    if (opened === null || !el) return;
    const active = document.activeElement;
    if (takeFocus && !el.contains(active)) {
      // A swap that dropped focus to the body keeps the first open's target.
      if (active instanceof HTMLElement && active !== document.body) {
        restore.current = active;
      }
      el.focus({ preventScroll: true });
    }
    const reduced = prefersReducedMotion();
    entrance.current?.cancel();
    entrance.current = el.animate(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, transform: nudge(10, dock) },
            { opacity: 1, transform: "none" },
          ],
      {
        duration: (reduced ? duration.instant : duration.base) * timeScale(),
        easing: reduced ? "linear" : ease.out,
      },
    );
  }, [opened, dock, takeFocus]);

  // Close: hand focus back right away, then fade out and unmount.
  useEffect(() => {
    const el = ref.current;
    if (!leaving || !el) return;
    const active = document.activeElement;
    if (!active || active === document.body || el.contains(active)) {
      if (restore.current?.isConnected) {
        restore.current.focus({ preventScroll: true });
      }
    }
    restore.current = null;
    const reduced = prefersReducedMotion();
    // One keyframe: it leaves from wherever the entrance had got to.
    const exit = el.animate(
      reduced ? [{ opacity: 0 }] : [{ opacity: 0, transform: nudge(6, dock) }],
      {
        duration: (reduced ? duration.instant : duration.fast) * timeScale(),
        easing: reduced ? "linear" : ease.inOut,
        fill: "forwards",
      },
    );
    exit.finished.then(
      () => setShown(null),
      () => {},
    );
    return () => exit.cancel();
  }, [leaving, dock]);

  if (!shown) return null;

  return (
    <section
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      tabIndex={-1}
      inert={leaving}
      data-state={leaving ? "closed" : "open"}
      className={cn(
        "absolute z-(--z-overlay) flex flex-col border border-strong bg-bg/85 text-ink outline-none backdrop-blur-md focus-visible:shadow-none",
        // Narrow: a sheet above the Back key. Wide: docked top right (or
        // left), clear of the Back key.
        "inset-x-4 bottom-14 max-h-[min(62dvh,calc(100dvh-8rem))]",
        "md:inset-x-auto md:top-4 md:bottom-auto md:max-h-[calc(100dvh-5.5rem)]",
        // Left (the relay's) stays narrower: the seated view's monitor starts
        // about a third of the way in, and it has to stay readable.
        dock === "left"
          ? "md:left-4 md:w-[min(26rem,30vw)]"
          : "md:right-4 md:w-[min(28rem,48vw)]",
      )}
    >
      <header className="flex items-start justify-between gap-4 border-b border-hairline py-3 pr-2 pl-4">
        <div className="min-w-0 pt-0.5">
          <p className="flex items-center gap-2 font-mono text-label text-ink-muted uppercase">
            <Led state="accent" />
            {shown.kicker}
          </p>
          <h2 id={titleId} className="mt-1.5 text-lg font-light text-balance">
            {shown.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          aria-keyshortcuts="Escape"
          className="inline-flex h-7 shrink-0 items-center gap-1.5 px-1.5 text-ink-muted transition-colors duration-(--dur-fast) ease-out hover:bg-sunken hover:text-ink"
        >
          <Kbd>Esc</Kbd>
          <XIcon weight="light" className="size-4" />
        </button>
      </header>
      <div
        key={shown.title}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-5"
      >
        {shown.body}
      </div>
    </section>
  );
}
