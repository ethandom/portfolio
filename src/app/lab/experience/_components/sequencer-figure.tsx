"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { Figure } from "@/components/manual";
import { prefersReducedMotion, timeScale } from "@/components/motion/preference";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/*
 * Placeholder flow until the real pipeline is written up. Sources are named
 * by kind only, never by site (see the data-source rule).
 */
const STAGES = ["Collect", "Parse", "Clean", "Match", "Segment"];
const TICKS = 16;
/** Ticks the finished grid holds before the loop restarts. */
const HOLD = 4;

const PITCH = 26;
const CELL = 22;
const X0 = 84;
const Y0 = 20;

type Mode = "serial" | "pipelined";

/** Which record sits in stage s at tick t, or null. */
function recordAt(mode: Mode, s: number, t: number) {
  const d = t - s;
  if (d < 0) return null;
  if (mode === "pipelined") return d;
  return d % STAGES.length === 0 ? d / STAGES.length : null;
}

/** Records through the last stage by the end of tick t. */
function finished(mode: Mode, t: number) {
  const last = STAGES.length - 1;
  if (t < last) return 0;
  return mode === "pipelined" ? t - last + 1 : Math.floor((t - last) / STAGES.length) + 1;
}

/**
 * Fig. for the Center for Puppetry Arts: information processing as a step
 * sequencer. One record at a time versus every stage busy on every tick.
 */
export function SequencerFigure({ number }: { number: number }) {
  const [mode, setMode] = useState<Mode>("pipelined");
  const [tick, setTick] = useState(TICKS - 1);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Only runs while you can see it.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), {
      threshold: 0.3,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || paused || prefersReducedMotion()) return;
    let t = -1;
    const timer = setInterval(() => {
      t = (t + 1) % (TICKS + HOLD);
      setTick(Math.min(t, TICKS - 1));
    }, 240 * timeScale());
    return () => clearInterval(timer);
  }, [visible, paused, mode]);

  const out = finished(mode, tick);
  const width = X0 + TICKS * PITCH;
  const height = Y0 + STAGES.length * PITCH + 4;

  return (
    <Figure
      number={number}
      title="Intake sequencer"
      meta={`t ${String(tick + 1).padStart(2, "0")}/${TICKS} · out ${String(out).padStart(2, "0")}`}
      scroll
      note="Records from public and government-reported sources pass five stages. One at a time, most stages sit idle; pipelined, every stage works every tick."
    >
      <div ref={ref} className="mx-auto grid w-full max-w-[520px] min-w-[30rem] gap-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${mode === "pipelined" ? "Pipelined" : "Serial"} processing: ${finished(mode, TICKS - 1)} records through all five stages in ${TICKS} ticks, versus ${finished(mode === "pipelined" ? "serial" : "pipelined", TICKS - 1)} the other way.`}
          className="block w-full font-mono"
        >
          {/* Playhead: a tick mark over the current column. */}
          <rect
            x={X0 + tick * PITCH - 2}
            y={Y0 - 4}
            width={CELL + 4}
            height={STAGES.length * PITCH + 4}
            fill="none"
            stroke="var(--accent)"
          />
          {Array.from({ length: TICKS }, (_, t) => (
            <text
              key={t}
              x={X0 + t * PITCH + CELL / 2}
              y={12}
              textAnchor="middle"
              fontSize="9"
              fill={t === tick ? "var(--ink)" : "var(--ink-muted)"}
            >
              {t + 1}
            </text>
          ))}
          {STAGES.map((stage, s) => (
            <g key={stage}>
              <text x={0} y={Y0 + s * PITCH + 15} fontSize="10" fill="var(--ink-muted)">
                {String(s + 1).padStart(2, "0")} {stage.toUpperCase()}
              </text>
              {Array.from({ length: TICKS }, (_, t) => {
                const r = t <= tick ? recordAt(mode, s, t) : null;
                const now = t === tick;
                return (
                  <g key={t}>
                    <rect
                      x={X0 + t * PITCH}
                      y={Y0 + s * PITCH}
                      width={CELL}
                      height={CELL}
                      fill={r === null ? "var(--sunken)" : now ? "var(--accent)" : "var(--ink)"}
                    />
                    {r !== null && (
                      <text
                        x={X0 + t * PITCH + CELL / 2}
                        y={Y0 + s * PITCH + 15}
                        textAnchor="middle"
                        fontSize="9"
                        fill={now ? "var(--tape-ink)" : "var(--ink-inverse)"}
                      >
                        {r + 1}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <ToggleGroup
            type="single"
            size="sm"
            value={mode}
            onValueChange={(v) => v && setMode(v as Mode)}
            aria-label="Processing mode"
          >
            <ToggleGroupItem value="serial">
              One at a time · {finished("serial", TICKS - 1)}
            </ToggleGroupItem>
            <ToggleGroupItem value="pipelined">
              Pipelined · {finished("pipelined", TICKS - 1)}
            </ToggleGroupItem>
          </ToggleGroup>
          <Button variant="outline" size="sm" onClick={() => setPaused((p) => !p)}>
            {paused ? <PlayIcon weight="light" /> : <PauseIcon weight="light" />}
            {paused ? "Run" : "Pause"}
          </Button>
        </div>
      </div>
    </Figure>
  );
}
