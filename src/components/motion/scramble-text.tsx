"use client";

import { useEffect, useEffectEvent, useRef } from "react";
import { cn } from "@/lib/cn";
import { duration as dur, SCRAMBLE_GLYPHS } from "@/lib/motion/presets";
import { prefersReducedMotion, timeScale, useTriggerMode, type Trigger } from "./preference";
import { useEntrance } from "./use-entrance";

/** Glyphs change on a teleprinter cadence, not every frame. */
const TICK = 45;

function isFixed(char: string) {
  return !/[A-Za-z0-9]/.test(char);
}

function noise(text: string, from: number) {
  let out = "";
  for (let i = from; i < text.length; i++) {
    out += isFixed(text[i])
      ? text[i]
      : SCRAMBLE_GLYPHS[Math.floor(Math.random() * SCRAMBLE_GLYPHS.length)];
  }
  return out;
}

/**
 * A mono readout that settles left to right through hex digits, like a
 * display resolving a value. Plays on entrance and again whenever `text`
 * changes, so a changed value is visibly re-read.
 *
 * Mono only: every glyph has the same width, so nothing reflows while it runs.
 * Screen readers get the final text; the noise is aria-hidden.
 */
export function ScrambleText({
  text,
  trigger: triggerProp = "view",
  className,
}: {
  text: string;
  trigger?: Trigger;
  className?: string;
}) {
  const trigger = useTriggerMode(triggerProp);
  const settledRef = useRef<HTMLSpanElement>(null);
  const noiseRef = useRef<HTMLSpanElement>(null);
  const hostRef = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const shown = useRef(text);
  const finalRef = useRef<HTMLSpanElement>(null);
  const readoutRef = useRef<HTMLSpanElement>(null);

  // Toggled on the DOM, not in state: a readout running is a paint concern.
  function setRunning(on: boolean) {
    finalRef.current?.classList.toggle("sr-only", on);
    if (readoutRef.current) readoutRef.current.hidden = !on;
  }

  function paint(settled: string, rest: string) {
    if (settledRef.current) settledRef.current.textContent = settled;
    if (noiseRef.current) noiseRef.current.textContent = rest;
  }

  function run(target: string) {
    cancelAnimationFrame(frame.current);
    if (document.hidden) return setRunning(false);
    setRunning(true);
    const scale = timeScale();
    // ~22ms per character, never shorter than a reveal or longer than a slow move.
    const total = Math.min(Math.max(target.length * 22, dur.base), dur.slow + dur.base) * scale;
    const start = performance.now();
    let tick = -1;

    const step = (now: number) => {
      const t = Math.min((now - start) / total, 1);
      const settled = Math.floor(t * target.length);
      const nextTick = Math.floor((now - start) / (TICK * scale));
      if (nextTick !== tick || t === 1) {
        tick = nextTick;
        paint(target.slice(0, settled), noise(target, settled));
      }
      if (t < 1) frame.current = requestAnimationFrame(step);
      else setRunning(false);
    };
    frame.current = requestAnimationFrame(step);
  }

  useEntrance(hostRef, trigger, {
    prepare: () => {
      setRunning(true);
      paint("", noise(text, 0));
    },
    play: () => run(text),
  });

  // A new value re-runs the readout from wherever it is.
  const rerun = useEffectEvent((next: string) => run(next));
  useEffect(() => {
    if (shown.current === text) return;
    shown.current = text;
    if (!prefersReducedMotion()) rerun(text);
  }, [text]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <span ref={hostRef} className={cn("whitespace-pre", className)}>
      <span ref={finalRef}>{text}</span>
      <span ref={readoutRef} aria-hidden hidden>
        <span ref={settledRef} />
        <span ref={noiseRef} className="text-ink-muted" />
      </span>
    </span>
  );
}
