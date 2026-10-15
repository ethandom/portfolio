"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useReducedMotion } from "@/components/motion";
import { cn } from "@/lib/cn";

type Entry = { slug: string; no: string; title: string };

/**
 * Smallest the pinned header and book may shrink to fit a short screen.
 * Any smaller and the type stops reading as body text, so it stacks instead.
 */
const MIN_SCALE = 0.7;
/** Where the header and book pin: this far below the top of the screen (px). */
const PIN_TOP = 24;
/** Viewport scrolled per page turn, as a fraction of its height. */
const TURN = 0.9;
/** Share of each turn's scroll the book holds still before and after turning. */
const DWELL = 0.18;
/** Ink tint at the moment the page stands on edge. */
const SHADE = 0.14;
/**
 * Most leaves drawn on one side of the block, and how far each leaf's edge
 * steps out (px). They fan mostly sideways: the foot of the block counts
 * toward the screen-height fit, the sides don't.
 */
const LEAVES = 8;
const STEP_X = 3;
const STEP_Y = 1.25;
/** Leaves each sheet adds to a side, so one turn reads as one sheet moving. */
const PER_SHEET = 2;
/** The boards' lip past the page block (px). */
const BOARD = 6;
/** Where the right page starts: past the left page and the 1rem binding. */
const SPINE = "calc(50% + 0.5rem)";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (t: number) => t * t * (3 - 2 * t);
/** How far turn t has gone at scroll position q (0 → 1). */
const turned = (q: number, t: number) =>
  smooth(clamp01((q - t - DWELL) / (1 - 2 * DWELL)));

/** Shows the first `count` leaves of one side's block. */
function thicken(edge: HTMLElement | null, count: number) {
  edge?.querySelectorAll<HTMLElement>("[data-leaf]").forEach((leaf) => {
    leaf.style.visibility = Number(leaf.dataset.leaf) <= count ? "" : "hidden";
  });
}

/**
 * The Projects chapter: pins the chapter header and the project spreads,
 * bound as one book, and turns the pages with the scroll. Header and book
 * hold still together while pinned, so the book never drifts off its header.
 *
 * It opens closed, on its front cover. The first turn swings the cover open
 * onto the first spread; after that each turn lifts one right page on the
 * binding until it stands on edge, and the next left page comes down flat.
 * The page block on either side changes only by the sheet that turns. No
 * shadows, only an ink tint.
 *
 * The server renders the spreads stacked. The book only takes over on wide
 * screens, with motion allowed. On a screen too short for header and book,
 * the book scales down to fit under its full-width header (to MIN_SCALE;
 * below that it stacks).
 */
export function SpreadBook({
  chapter,
  title,
  entries,
  header,
  children,
}: {
  chapter: number;
  title: string;
  entries: Entry[];
  /** The chapter header, pinned with the book. */
  header: ReactNode;
  children: ReactNode;
}) {
  const runway = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const book = useRef<HTMLDivElement>(null);
  const cover = useRef<HTMLDivElement>(null);
  const insideBoard = useRef<HTMLDivElement>(null);
  const backBoard = useRef<HTMLDivElement>(null);
  const edges = useRef<Record<"left" | "right", HTMLDivElement | null>>({
    left: null,
    right: null,
  });
  const reduced = useReducedMotion();
  const [mode, setMode] = useState<"stack" | "book">("stack");
  /** The open spread; -1 while the book is closed. */
  const [current, setCurrent] = useState(-1);
  /** The pinned block's height on screen, after scaling. */
  const [height, setHeight] = useState(0);
  const [scale, setScale] = useState(1);
  const n = entries.length;
  /** The cover's turn, then one per page. */
  const turns = n;

  // Book or stack, re-decided on resize.
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 64rem)");
    const decide = () => {
      const el = book.current;
      if (!el || reduced || !wide.matches || n < 2) return setMode("stack");
      const spreads = [...el.querySelectorAll<HTMLElement>("[data-spread]")];
      // In book mode the shared grid cell is as tall as the tallest spread.
      const tallest =
        mode === "book"
          ? el.offsetHeight
          : Math.max(...spreads.map((s) => s.offsetHeight));
      // The header rides along: its height plus the 2rem gap under it.
      const above = (head.current?.offsetHeight ?? 0) + 32;
      // Only the book shrinks; the header keeps the full chapter width.
      const bound = tallest + LEAVES * STEP_Y + BOARD;
      const room = window.innerHeight - 2 * PIN_TOP - above;
      const fit = Math.min(1, room / bound);
      setScale(fit);
      setHeight(above + bound * fit);
      setMode(fit >= MIN_SCALE ? "book" : "stack");
    };
    decide();
    window.addEventListener("resize", decide);
    wide.addEventListener("change", decide);
    return () => {
      window.removeEventListener("resize", decide);
      wide.removeEventListener("change", decide);
    };
  }, [reduced, mode, n]);

  // Scroll → page angles. Written straight to style; React only hears the spread index.
  useEffect(() => {
    const el = book.current;
    const pinned = pin.current;
    const track = runway.current;
    if (!el || !pinned || !track) return;
    const spreads = [...el.querySelectorAll<HTMLElement>("[data-spread]")];
    const bindings = spreads.flatMap((s) => [
      ...s.querySelectorAll<HTMLElement>("[data-binding]"),
    ]);
    const pages = spreads.map((s) => ({
      verso: s.querySelector<HTMLElement>('[data-page="verso"]'),
      recto: s.querySelector<HTMLElement>('[data-page="recto"]'),
    }));

    const set = (
      page: HTMLElement | null,
      angle: number,
      z: number,
      origin: string,
    ) => {
      if (!page) return;
      page.style.transformOrigin = origin;
      page.style.transform = angle
        ? `perspective(2400px) rotateY(${angle}deg)`
        : "";
      page.style.zIndex = String(z);
      const shade = page.querySelector<HTMLElement>("[data-shade]");
      if (shade)
        shade.style.opacity = String(
          SHADE * Math.sin((Math.abs(angle) * Math.PI) / 180),
        );
    };

    if (mode === "stack") {
      bindings.forEach((b) => (b.style.visibility = ""));
      pages.forEach(({ verso, recto }) => {
        set(verso, 0, 0, "");
        set(recto, 0, 0, "");
      });
      return;
    }

    let frame = 0;
    const draw = () => {
      frame = 0;
      const travel = track.offsetHeight - pinned.offsetHeight;
      const top = track.getBoundingClientRect().top - PIN_TOP;
      // 0 = closed on the cover; t = spread t - 1 open.
      const q = clamp01(-top / travel) * turns;

      // Turn 0 is the cover; turn t ≥ 1 takes spread t - 1's right page over.
      const opening = turned(q, 0);
      const open = opening >= 0.5;
      const front = cover.current;
      if (front) {
        front.style.transform = opening
          ? `perspective(2400px) rotateY(${-180 * Math.min(opening, 0.5)}deg)`
          : "";
        front.style.visibility = open ? "hidden" : "";
      }
      // Closed, only the right half of the book exists: the left pages
      // stand edge-on and the binding isn't showing yet.
      bindings.forEach((b) => (b.style.visibility = open ? "" : "hidden"));
      pages.forEach(({ verso, recto }, i) => {
        const out = turned(q, i + 1);
        const into = turned(q, i);
        set(
          recto,
          i < n - 1 ? -180 * Math.min(out, 0.5) : 0,
          2 * n - i,
          "left center",
        );
        set(verso, into < 0.5 ? 90 : 180 * (1 - into), i + 1, "right center");
      });

      // One sheet per page turn: it leaves the right block as it lifts and
      // joins the left block as it lands. Nothing else in the block moves.
      let lifted = 0;
      let landed = 0;
      for (let t = 1; t < turns; t++) {
        if (turned(q, t) > 0) lifted++;
        if (turned(q, t) >= 1) landed++;
      }
      const right = PER_SHEET * (n - lifted);
      const left = PER_SHEET * landed;
      thicken(edges.current.right, right);
      thicken(edges.current.left, left);

      // The boards sit one lip past their block, so they move with it.
      const back = backBoard.current;
      if (back) {
        back.style.right = `${-(right * STEP_X + BOARD)}px`;
        back.style.bottom = `${-(right * STEP_Y + BOARD)}px`;
      }
      // The front board's inside is the same leaf as the cover: it comes
      // down on the spine with the first left page on it, then lies under
      // the left block.
      const inside = insideBoard.current;
      if (inside) {
        const angle = opening < 0.5 ? 90 : 180 * (1 - opening);
        inside.style.visibility = open ? "" : "hidden";
        inside.style.transformOrigin = "right center";
        inside.style.transform = angle
          ? `perspective(2400px) rotateY(${angle}deg)`
          : "";
        inside.style.left = `${-(left * STEP_X + BOARD)}px`;
        inside.style.bottom = `${-(left * STEP_Y + BOARD - 2)}px`;
      }

      setCurrent(open ? Math.min(n - 1, Math.max(0, Math.round(q - 1))) : -1);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode, n, turns]);

  /** Scroll to spread i: its resting point in the book, or the spread itself when stacked. */
  const goTo = (i: number, behavior: ScrollBehavior) => {
    const el = book.current;
    const pinned = pin.current;
    const track = runway.current;
    if (!el || !pinned || !track) return;
    if (mode === "stack") {
      el.querySelectorAll<HTMLElement>("[data-spread]")[i]?.scrollIntoView({
        behavior,
        block: "start",
      });
      return;
    }
    const travel = track.offsetHeight - pinned.offsetHeight;
    const start = track.getBoundingClientRect().top + window.scrollY - PIN_TOP;
    window.scrollTo({ top: start + (travel * (i + 1)) / turns, behavior });
  };

  const board = "bg-inverse dark:border dark:border-rule dark:bg-sunken";

  return (
    <div
      ref={runway}
      style={
        mode === "book"
          ? { height: `calc(${height}px + ${turns * TURN * 100}svh)` }
          : undefined
      }
    >
      <div
        ref={pin}
        style={mode === "book" ? { top: PIN_TOP, height } : undefined}
        className={cn("grid grid-cols-1", mode === "book" && "sticky")}
      >
        <div className="grid grid-cols-1 gap-8">
          <div ref={head}>{header}</div>
          <div
            ref={book}
            // Scaled from its top edge, so it stays tucked under the header.
            style={
              mode === "book" && scale < 1
                ? {
                    transform: `scale(${scale})`,
                    transformOrigin: "top center",
                  }
                : undefined
            }
            // A link on a covered page turns the book to it.
            onFocusCapture={(event) => {
              if (mode !== "book") return;
              const spread = (event.target as HTMLElement).closest(
                "[data-spread]",
              );
              const i = [
                ...(book.current?.querySelectorAll("[data-spread]") ?? []),
              ].indexOf(spread as Element);
              if (i >= 0 && i !== current) goTo(i, "auto");
            }}
            className={cn(
              "grid grid-cols-1",
              mode === "book"
                ? cn(
                    "relative isolate [&>[data-spread]]:[grid-area:1/1]",
                    // In the book each page carries its own edge, so what lies
                    // under a turning page (the cover board, the block) shows.
                    "[&>[data-spread]]:border-transparent [&>[data-spread]]:bg-transparent",
                    "[&_[data-page=verso]]:border-y [&_[data-page=verso]]:border-l [&_[data-page=verso]]:border-strong",
                    "[&_[data-page=recto]]:border-y [&_[data-page=recto]]:border-r [&_[data-page=recto]]:border-strong",
                  )
                : "gap-16",
            )}
          >
            {mode === "book" && (
              <>
                {/*
                 * Boards: the back board under the right block; the front
                 * board's inside under the left one once open. draw() sizes
                 * both to their block.
                 */}
                <div
                  ref={backBoard}
                  aria-hidden
                  className={cn("pointer-events-none absolute -z-20", board)}
                  style={{ top: 2, left: SPINE }}
                />
                <div
                  ref={insideBoard}
                  aria-hidden
                  className={cn("pointer-events-none absolute -z-20", board)}
                  style={{ top: -2, right: SPINE }}
                />

                {/*
                 * The page block: leaves fanned out past the outer edge and the
                 * foot of each page, one hairline per leaf. Flat paper, no shadow.
                 */}
                {(["left", "right"] as const).map((side) => (
                  <div
                    key={side}
                    aria-hidden
                    ref={(el) => {
                      edges.current[side] = el;
                    }}
                    className="pointer-events-none absolute inset-0 -z-10"
                  >
                    {Array.from({ length: LEAVES }, (_, i) => LEAVES - i).map(
                      (k) => (
                        <span
                          key={k}
                          data-leaf={k}
                          className={cn(
                            "absolute border bg-surface",
                            k === 1 ? "border-rule" : "border-hairline",
                          )}
                          style={{
                            top: k * 0.5,
                            bottom: -k * STEP_Y,
                            [side]: -k * STEP_X,
                            width: `calc((100% - 1rem) / 2 + ${k * STEP_X}px)`,
                          }}
                        />
                      ),
                    )}
                  </div>
                ))}

                <FrontCover
                  ref={cover}
                  chapter={chapter}
                  title={title}
                  entries={entries}
                />
              </>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The closed book: a graphite hard cover over the right half, printed like
 * the manual's own cover. It swings open on the spine with the first turn.
 */
function FrontCover({
  ref,
  chapter,
  title,
  entries,
}: {
  ref: React.Ref<HTMLDivElement>;
  chapter: number;
  title: string;
  entries: Entry[];
}) {
  const no = String(chapter).padStart(2, "0");
  return (
    <div
      ref={ref}
      aria-hidden
      data-theme="dark"
      className="absolute z-50 flex origin-left flex-col border border-strong bg-surface text-ink"
      style={{ top: -2, bottom: -BOARD + 2, left: SPINE, right: -BOARD }}
    >
      {/* The hinge groove along the spine */}
      <span className="absolute inset-y-0 left-3 w-px bg-hairline" />

      <div className="flex items-center justify-between border-b border-hairline py-2 pr-8 pl-10 font-mono text-label text-ink-muted uppercase">
        <span>Operator&rsquo;s Manual</span>
        <span>Ch. {no}</span>
      </div>

      <div className="flex flex-1 flex-col justify-center pr-8 pl-10">
        <p className="font-mono text-[clamp(3.5rem,2.5rem+3vw,5.5rem)] leading-none font-light tracking-[-0.04em] text-ink-muted">
          {no}
        </p>
        <p className="mt-3 text-display font-light">{title}</p>

        <ol className="mt-10 border-t border-strong">
          {entries.map((entry, i) => (
            <li
              key={entry.slug}
              className="flex items-baseline gap-3 border-b border-hairline py-2.5"
            >
              <span className="font-mono text-label text-accent-text">
                {entry.no}
              </span>
              <span className="text-base">{entry.title}</span>
              <span className="flex-1 translate-y-[-0.3em] border-b border-dotted border-rule" />
              <span className="font-mono text-label text-ink-muted">
                p. {String(4 + i * 2).padStart(2, "0")}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <span className="h-3 bg-tape" />
    </div>
  );
}
