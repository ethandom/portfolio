"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/components/motion";
import { timeScale } from "@/components/motion/preference";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/*
 * The idea behind Tempr: Spotify scores every track on the same audio
 * features, and Tempr's prompt step returns a weight for five of them
 * (gemini.ts). The song vector is Σ wᵢ·fᵢ.
 *
 * Five dimensions don't fit on a page, so this is a star-coordinates
 * projection: each feature fᵢ gets its own direction in the plane, 72° apart.
 * The projection is linear, so the projected song vector is exactly the
 * tip-to-tail sum of the projected, weighted features.
 * The weights are illustrative.
 */

type W = readonly [number, number, number, number, number];

/** Clockwise from the top. Acousticness sits opposite the energetic three. */
const FEATURES = [
  { label: "Energy", short: "E" },
  { label: "Danceability", short: "D" },
  { label: "Tempo", short: "T" },
  { label: "Acousticness", short: "A" },
  { label: "Valence", short: "V" },
] as const;

/** Tempo in bpm, scaled onto 0–1 over the 60–200 range the prompt step uses. */
const bpm = (b: number) => (b - 60) / 140;

const PROMPTS: Record<string, { label: string; w: W }> = {
  workout: { label: "Workout", w: [0.9, 0.75, bpm(160), 0.05, 0.7] },
  drive: { label: "Night drive", w: [0.55, 0.6, bpm(100), 0.2, 0.35] },
  rain: { label: "Rainy day", w: [0.25, 0.35, bpm(78), 0.75, 0.3] },
};

type PromptId = keyof typeof PROMPTS;

/* ------------------------------------------------------------ projection -- */

const R = 140;
const O = { x: 200, y: 180 };
const DIRS = FEATURES.map((_, i) => {
  const a = -Math.PI / 2 + (i * 2 * Math.PI) / FEATURES.length;
  return { x: Math.cos(a), y: Math.sin(a) };
});
const at = (x: number, y: number) => ({ x: O.x + x * R, y: O.y + y * R });

const SLIDE_MS = 720;
const easeInOut = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/* ----------------------------------------------------------------- plot -- */

function Arrowhead({ id, className }: { id: string; className: string }) {
  return (
    <marker
      id={id}
      viewBox="0 0 8 8"
      refX="7"
      refY="4"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M0 0 8 4 0 8z" className={className} />
    </marker>
  );
}

function Plot({ w }: { w: W }) {
  // Weighted features from the origin, and the same arrows laid tip to tail.
  const parts = DIRS.map((d, i) => ({ x: d.x * w[i], y: d.y * w[i] }));
  const chain = parts.reduce<{ x: number; y: number }[]>(
    (acc, p) => {
      const last = acc[acc.length - 1];
      return [...acc, { x: last.x + p.x, y: last.y + p.y }];
    },
    [{ x: 0, y: 0 }],
  );
  const sum = at(chain[chain.length - 1].x, chain[chain.length - 1].y);

  return (
    <svg
      viewBox="-20 0 470 330"
      className="absolute inset-0 size-full"
      aria-hidden
    >
      <defs>
        <Arrowhead id="sv-part" className="fill-diagram" />
        <Arrowhead id="sv-chain" className="fill-ink-muted" />
        <Arrowhead id="sv-sum" className="fill-accent" />
      </defs>

      {/* Scale rings at 0.5 and 1 */}
      <g className="stroke-hairline" fill="none" strokeWidth={1}>
        {[0.5, 1].map((r) => (
          <polygon
            key={r}
            points={DIRS.map((d) => {
              const p = at(d.x * r, d.y * r);
              return `${p.x},${p.y}`;
            }).join(" ")}
          />
        ))}
      </g>

      {/* Feature axes */}
      <g className="stroke-strong" strokeWidth={1}>
        {DIRS.map((d, i) => {
          const p = at(d.x * 1.06, d.y * 1.06);
          return <line key={i} x1={O.x} y1={O.y} x2={p.x} y2={p.y} />;
        })}
      </g>

      {/* wᵢ·fᵢ from the origin */}
      <g className="stroke-diagram" strokeWidth={2}>
        {parts.map((p, i) => {
          const q = at(p.x, p.y);
          return (
            <line
              key={i}
              x1={O.x}
              y1={O.y}
              x2={q.x}
              y2={q.y}
              markerEnd={w[i] > 0.08 ? "url(#sv-part)" : undefined}
            />
          );
        })}
      </g>

      {/* The same five, tip to tail */}
      <g className="stroke-ink-muted" strokeWidth={1} strokeDasharray="3 3">
        {chain.slice(1).map((c, i) => {
          const a = at(chain[i].x, chain[i].y);
          const b = at(c.x, c.y);
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              markerEnd={w[i] > 0.08 ? "url(#sv-chain)" : undefined}
            />
          );
        })}
      </g>

      {/* The resultant: the song vector */}
      <line
        x1={O.x}
        y1={O.y}
        x2={sum.x}
        y2={sum.y}
        className="stroke-accent"
        strokeWidth={3}
        markerEnd="url(#sv-sum)"
      />
      <circle cx={O.x} cy={O.y} r={3} className="fill-ink" />

      {/* Axis labels, haloed so they read over the arrows */}
      <g
        className="fill-ink stroke-surface font-mono text-[12px] tracking-wider uppercase sm:text-[10px]"
        strokeWidth={4}
        paintOrder="stroke"
      >
        {DIRS.map((d, i) => {
          const p = at(d.x * 1.14, d.y * 1.14);
          const anchor =
            Math.abs(d.x) < 0.2 ? "middle" : d.x > 0 ? "start" : "end";
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              dy={d.y < -0.5 ? "-0.2em" : d.y > 0.5 ? "0.9em" : "0.35em"}
              textAnchor={anchor}
            >
              {FEATURES[i].label}
            </text>
          );
        })}
      </g>
    </svg>
  );
}

/** Fig.: five weighted Spotify features and the song vector they sum to. */
export function SongVector({ figure }: { figure: string }) {
  const [prompt, setPrompt] = useState<PromptId>("workout");
  const [w, setW] = useState<W>(PROMPTS.workout.w);
  const shown = useRef<W>(PROMPTS.workout.w);

  // Tween the weights; every frame is still a weighted sum of the same five.
  useEffect(() => {
    const from = shown.current;
    const to = PROMPTS[prompt].w;
    const ms = prefersReducedMotion() ? 0 : SLIDE_MS * timeScale();
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = ms === 0 ? 1 : Math.min(1, (now - start) / ms);
      const k = easeInOut(t);
      shown.current = from.map((x, i) => x + (to[i] - x) * k) as unknown as W;
      setW(shown.current);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [prompt]);

  const target = PROMPTS[prompt].w;

  return (
    <figure className="flex min-w-0 flex-1 flex-col border border-strong bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-hairline px-3 py-2 font-mono text-label uppercase">
        <figcaption className="flex items-center gap-3">
          <span className="bg-inverse px-1.5 py-0.5 text-ink-inverse">
            Fig. {figure}
          </span>
          <span className="text-ink">Song vector</span>
        </figcaption>
        <span className="text-ink-muted normal-case">v = Σ wᵢ · fᵢ</span>
      </div>

      {/* Fills whatever height the facing page leaves; keeps its ratio when stacked. */}
      <div className="relative mx-3 my-4 aspect-[470/330] flex-1 sm:mx-6 lg:aspect-auto">
        <Plot w={w} />
        <p className="sr-only">
          The {PROMPTS[prompt].label} prompt weights the five features{" "}
          {FEATURES.map((f, i) => `${f.label} ${target[i].toFixed(2)}`).join(
            ", ",
          )}
          ; their sum is the song vector.
        </p>
      </div>

      <div className="grid gap-2 border-t border-hairline px-3 py-3">
        <ToggleGroup
          type="single"
          indicator={false}
          className="w-full"
          value={prompt}
          onValueChange={(v) => v && setPrompt(v as PromptId)}
          aria-label="Sample prompt"
        >
          {Object.entries(PROMPTS).map(([id, p]) => (
            <ToggleGroupItem key={id} value={id} className="min-w-fit px-2 sm:px-3">
              {p.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p
          aria-hidden
          className="flex gap-3 font-mono text-label text-ink-muted tabular-nums"
        >
          {FEATURES.map((f, i) => (
            <span key={f.short}>
              {f.short}{" "}
              <span className="text-ink">
                {target[i].toFixed(2).replace(/^0/, "")}
              </span>
            </span>
          ))}
        </p>
      </div>
      <div className="grid gap-1 border-t border-hairline px-3 py-2">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-label text-ink-muted uppercase">
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="w-3 border-t-2 border-diagram" />
            Features
          </span>
          <span className="flex items-center gap-1.5">
            <span aria-hidden className="w-3 border-t-[3px] border-accent" />
            Song vector
          </span>
        </p>
        <p className="text-sm text-ink-muted">
          A prompt weights each feature; their sum is the song vector.
          Illustrative values.
        </p>
      </div>
    </figure>
  );
}
