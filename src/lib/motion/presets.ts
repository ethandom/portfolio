/**
 * Motion presets for JS-driven animation (WAAPI, rAF).
 * Mirrors the duration and easing tokens in src/styles/tokens.css;
 * presets.test.ts fails if the two drift apart.
 */

/** Milliseconds. */
export const duration = {
  instant: 80,
  fast: 160,
  base: 240,
  slow: 480,
} as const;

export const ease = {
  /** Entrances, hovers: confident deceleration. */
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  /** Rules drawing, mode switches: a plotter pen accelerating and settling. */
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
  /** Relays and latches: a slight overshoot. */
  snap: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Numeric easing for rAF loops (CountUp); close to `ease.out`. */
export function easeOutExpo(t: number) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/** Sibling delay for list entrances. Capped so the last item never waits long. */
export function stagger(index: number, step = 60, max = 360) {
  return Math.min(index * step, max);
}

/**
 * Elements start their entrance when their top crosses 88% of the viewport.
 * Anything already above that line on first paint stays still.
 * The observed area also reaches far above the viewport, so a block that was
 * jumped past (End key, an anchor link) still counts as seen and reveals.
 */
export const VIEW_LINE = 0.88;
export const VIEW_ROOT_MARGIN = `1000% 0px -${Math.round((1 - VIEW_LINE) * 100)}% 0px`;

/** Hex digits: what a readout shows while it settles. */
export const SCRAMBLE_GLYPHS = "0123456789ABCDEF";
