"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { duration as dur, easeOutExpo } from "@/lib/motion/presets";
import { parseReadout } from "@/lib/motion/readout";
import { timeScale, useTriggerMode, type Trigger } from "./preference";
import { useEntrance } from "./use-entrance";

/**
 * A readout that counts up to its value, like a meter settling.
 * Takes the content string as-is ("650k", "1M+", "200+") and keeps its
 * prefix and suffix. Small targets count in tenths so the needle visibly moves.
 * Screen readers get the final value only.
 */
export function CountUp({
  value,
  trigger: triggerProp = "view",
  duration = dur.slow * 1.5,
  className,
}: {
  value: string;
  trigger?: Trigger;
  /** Milliseconds. Default 720: a deliberate, once-per-table moment. */
  duration?: number;
  className?: string;
}) {
  const trigger = useTriggerMode(triggerProp);
  const hostRef = useRef<HTMLSpanElement>(null);
  const liveRef = useRef<HTMLSpanElement>(null);
  const frame = useRef(0);
  const finalRef = useRef<HTMLSpanElement>(null);

  // Toggled on the DOM, not in state: a readout running is a paint concern.
  function setRunning(on: boolean) {
    finalRef.current?.classList.toggle("sr-only", on);
    if (liveRef.current) liveRef.current.hidden = !on;
  }
  const parsed = parseReadout(value);

  function format(n: number) {
    if (!parsed) return value;
    const { prefix, suffix, target, decimals, grouped } = parsed;
    const tenths = target < 10 && decimals === 0 && n < target;
    const text = n.toLocaleString("en-US", {
      minimumFractionDigits: tenths ? 1 : decimals,
      maximumFractionDigits: tenths ? 1 : decimals,
      useGrouping: grouped,
    });
    return prefix + text + suffix;
  }

  function paint(n: number) {
    if (liveRef.current) liveRef.current.textContent = format(n);
  }

  useEntrance(hostRef, trigger, {
    prepare: () => {
      if (!parsed) return;
      setRunning(true);
      paint(0);
    },
    play: () => {
      if (!parsed) return;
      if (document.hidden) return setRunning(false);
      const total = duration * timeScale();
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min((now - start) / total, 1);
        paint(parsed.target * easeOutExpo(t));
        if (t < 1) frame.current = requestAnimationFrame(step);
        else setRunning(false);
      };
      frame.current = requestAnimationFrame(step);
    },
  });

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return (
    <span ref={hostRef} className={cn("tabular-nums", className)}>
      <span ref={finalRef}>{value}</span>
      <span ref={liveRef} aria-hidden hidden />
    </span>
  );
}
