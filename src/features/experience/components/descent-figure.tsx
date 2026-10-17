"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { Figure } from "@/components/manual";
import { prefersReducedMotion, timeScale } from "@/components/motion/preference";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/cn";
import { useFirstView } from "./use-first-view";

/*
 * A loss surface drawn as a shaded mesh in SVG (no WebGL on the Manual page).
 * A ball runs plain gradient descent on it: x ← x − η∇L(x).
 *
 * The ball's valley is a spoon-shaped trench: about 4.5× steeper across than
 * along, closed at both ends, so it holds one clear minimum. That shape makes
 * step size visible: a small step crawls, a tuned step drops to the floor and
 * glides in, and a step past 1/curvature zigzags wall to wall, smaller each
 * time, until it settles in the bottom. The walls flatten off (1 − e^−q) far
 * from the ball's path so the figure keeps its height; the pits and the ridge
 * are scenery.
 */
function bump(x: number, y: number, cx: number, cy: number, s: number) {
  return Math.exp(-((x - cx) ** 2 + (y - cy) ** 2) / s);
}

const FLOOR = { x: 0.4, y: 0.1 };
const AXIS = Math.atan2(2.1, 1.9);
const WALL = 3;

/** Distance along the trench (u) and across it (v), from the floor. */
function trench(x: number, y: number) {
  const dx = x - FLOOR.x;
  const dy = y - FLOOR.y;
  return {
    u: dx * Math.cos(AXIS) + dy * Math.sin(AXIS),
    v: -dx * Math.sin(AXIS) + dy * Math.cos(AXIS),
  };
}

function loss(x: number, y: number) {
  const { u, v } = trench(x, y);
  return (
    WALL * (1 - Math.exp((-0.49 * v * v) / WALL)) +
    0.11 * u * u -
    0.6 * bump(x, y, -1.6, 1.9, 0.3) +
    0.7 * bump(x, y, 1.9, -1.6, 0.35) -
    0.5 * bump(x, y, -2.0, -0.9, 0.3)
  );
}

function gradient(x: number, y: number) {
  const h = 1e-4;
  return [
    (loss(x + h, y) - loss(x - h, y)) / (2 * h),
    (loss(x, y + h) - loss(x, y - h)) / (2 * h),
  ];
}

/** Server and client must print the same SVG numbers. */
function round(n: number) {
  return Math.round(n * 10) / 10;
}

const EXTENT = 2.8;
const GRID = 30;
const STEPS = 40;
/** Up on one wall, near the top end of the trench. */
const START = {
  x: FLOOR.x + 2.6 * Math.cos(AXIS) - 1.1 * Math.sin(AXIS),
  y: FLOOR.y + 2.6 * Math.sin(AXIS) + 1.1 * Math.cos(AXIS),
};

const RATES = {
  slow: { eta: 0.15, label: "Slow" },
  tuned: { eta: 1, label: "Tuned" },
  overshoot: { eta: 1.75, label: "Overshoot" },
} as const;
type Rate = keyof typeof RATES;

// View: turned so the trench runs diagonally, tipped 38° toward the reader.
const TURN = (10 * Math.PI) / 180;
const TIP = Math.sin((38 * Math.PI) / 180);
const SCALE = 58;
const LIFT = 40;

function depth(x: number, y: number) {
  return x * Math.sin(TURN) + y * Math.cos(TURN);
}

function project(x: number, y: number, z: number) {
  return {
    x: SCALE * (x * Math.cos(TURN) - y * Math.sin(TURN)),
    y: -SCALE * depth(x, y) * TIP - LIFT * z,
  };
}

/** The mesh, far quads first so near ones paint over them, and its frame. */
const { MESH, VIEW } = (() => {
  const step = (2 * EXTENT) / GRID;
  const quads = [];
  let zMin = Infinity;
  let zMax = -Infinity;
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const x0 = -EXTENT + i * step;
      const y0 = -EXTENT + j * step;
      const corners = [
        [x0, y0],
        [x0 + step, y0],
        [x0 + step, y0 + step],
        [x0, y0 + step],
      ];
      const zs = corners.map(([x, y]) => loss(x, y));
      const z = zs.reduce((a, b) => a + b) / 4;
      zMin = Math.min(zMin, z);
      zMax = Math.max(zMax, z);
      const pts = corners.map(([x, y], k) => project(x, y, zs[k]));
      for (const p of pts) {
        box.x0 = Math.min(box.x0, p.x);
        box.y0 = Math.min(box.y0, p.y);
        box.x1 = Math.max(box.x1, p.x);
        box.y1 = Math.max(box.y1, p.y);
      }
      quads.push({
        d: `M${pts.map((p) => `${round(p.x)},${round(p.y)}`).join("L")}Z`,
        z,
        depth: depth(x0 + step / 2, y0 + step / 2),
      });
    }
  }
  quads.sort((a, b) => b.depth - a.depth);
  // Room above for the ball on the far rim.
  const pad = 14;
  return {
    MESH: quads.map((q) => ({
      d: q.d,
      // Six flat bands, the lowest taking the most blueprint ink. Spaced on
      // a square-root scale so they bunch up near the bottom like contour
      // lines, and the minimum shows as a small lit oval.
      band: 5 - Math.min(5, Math.floor(Math.sqrt((q.z - zMin) / (zMax - zMin)) * 6)),
    })),
    VIEW: [box.x0 - pad, box.y0 - pad, box.x1 - box.x0 + 2 * pad, box.y1 - box.y0 + 2 * pad]
      .map(round)
      .join(" "),
  };
})();

const BAND_MIX = [6, 12, 18, 26, 36, 50];

function descend(eta: number) {
  const path = [];
  let { x, y } = START;
  for (let i = 0; i <= STEPS; i++) {
    path.push({ x, y });
    const [gx, gy] = gradient(x, y);
    x = Math.max(-EXTENT, Math.min(EXTENT, x - eta * gx));
    y = Math.max(-EXTENT, Math.min(EXTENT, y - eta * gy));
  }
  return path;
}

/** The ball between steps, sitting on the surface. */
function at(path: { x: number; y: number }[], t: number) {
  const i = Math.min(Math.max(Math.floor(t), 0), STEPS);
  const a = path[i];
  const b = path[Math.min(i + 1, STEPS)];
  const k = t - i;
  const x = a.x + (b.x - a.x) * k;
  const y = a.y + (b.y - a.y) * k;
  return { x, y, z: loss(x, y) };
}

const MS_PER_STEP = 150;

/**
 * Fig. for the Google apprenticeship: how a model learns, as a ball rolling
 * down a loss surface. Pick a step size and it rolls again.
 *
 * `compact`: in a narrow panel the surface shrinks to the column instead of
 * holding its 26rem and scrolling, and the frame's margins tighten.
 */
export function DescentFigure({
  number,
  compact = false,
}: {
  number: number;
  compact?: boolean;
}) {
  const [rate, setRate] = useState<Rate>("tuned");
  const [t, setT] = useState(STEPS);
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);

  const path = descend(RATES[rate].eta);
  const ball = at(path, t);
  const head = project(ball.x, ball.y, ball.z);
  const trail = [
    ...path.slice(0, Math.max(Math.floor(t), 0) + 1).map((p) => project(p.x, p.y, loss(p.x, p.y))),
    head,
  ];

  /** Rolls from the start, one step per MS_PER_STEP. */
  function roll() {
    cancelAnimationFrame(frame.current);
    if (prefersReducedMotion()) {
      setT(STEPS);
      return;
    }
    const begin = performance.now();
    const per = MS_PER_STEP * timeScale();
    const tick = (now: number) => {
      // A frame's timestamp is when the frame began, which can be before
      // `begin`; unclamped, t goes negative and indexes path[-1].
      const next = Math.min(STEPS, Math.max(0, (now - begin) / per));
      setT(next);
      if (next < STEPS) frame.current = requestAnimationFrame(tick);
    };
    setT(0);
    frame.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  useFirstView(ref, { hide: () => setT(0), play: roll });

  function pick(next: string) {
    if (!next) return;
    setRate(next as Rate);
    roll();
  }

  return (
    <Figure
      number={number}
      title="Gradient descent"
      meta={
        <>
          {/* Uppercase would turn η into Η. */}
          <span className="normal-case">η</span> {RATES[rate].eta} · L{" "}
          {ball.z.toFixed(2)}
        </>
      }
      scroll={!compact}
      bodyClassName={compact ? "px-4 py-5 sm:px-4" : undefined}
      note="The ball steps downhill along the slope. Too small a step crawls; too large zigzags wall to wall on the way down."
    >
      <div
        ref={ref}
        className={cn(
          "mx-auto grid w-full max-w-[560px] gap-4",
          !compact && "min-w-[26rem]",
        )}
      >
        <svg
          viewBox={VIEW}
          role="img"
          aria-label={`A ball descending a loss surface with step size ${RATES[rate].eta}, from loss ${loss(START.x, START.y).toFixed(2)} to ${loss(path[STEPS].x, path[STEPS].y).toFixed(2)} after ${STEPS} steps.`}
          className="block w-full"
        >
          {MESH.map((q, i) => (
            <path
              key={i}
              d={q.d}
              fill={`color-mix(in oklab, var(--diagram) ${BAND_MIX[q.band]}%, var(--surface))`}
              stroke="var(--diagram)"
              strokeOpacity={0.45}
              strokeWidth={0.5}
              strokeLinejoin="round"
            />
          ))}
          <polyline
            points={trail.map((p) => `${round(p.x)},${round(p.y)}`).join(" ")}
            fill="none"
            stroke="var(--ink)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={round(head.x)} cy={round(head.y) - 4} r={5} fill="var(--accent)" stroke="var(--ink)" strokeWidth={1} />
        </svg>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup type="single" size="sm" value={rate} onValueChange={pick} aria-label="Step size">
            {(Object.keys(RATES) as Rate[]).map((key) => (
              <ToggleGroupItem key={key} value={key} className="flex-none">
                {RATES[key].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={roll}>
            <ArrowCounterClockwiseIcon weight="light" />
            Replay
          </Button>
        </div>
      </div>
    </Figure>
  );
}
