"use client";

import { useRef, type ReactNode } from "react";
import { duration as dur, ease } from "@/lib/motion/presets";
import { timeScale, useTriggerMode, type Trigger } from "./preference";
import { useEntrance } from "./use-entrance";

type Part = { el: SVGElement; step: number; length: number };

function stepOf(el: Element, attr: string) {
  return Number(el.getAttribute(attr)) || 0;
}

function collect(root: HTMLElement) {
  const strokes: Part[] = [];
  root.querySelectorAll<SVGGeometryElement>("[data-draw]").forEach((el) => {
    strokes.push({ el, step: stepOf(el, "data-draw"), length: el.getTotalLength() });
  });
  const fills = [...root.querySelectorAll<SVGElement>("[data-draw-fill]")].map((el) => ({
    el,
    step: stepOf(el, "data-draw-fill"),
  }));
  const fades = [...root.querySelectorAll<SVGElement>("[data-draw-fade]")].map((el) => ({
    el,
    step: stepOf(el, "data-draw-fade"),
  }));
  return { strokes, fills, fades };
}

/**
 * Plots a diagram the way a pen plotter would: strokes first, in steps,
 * then fills and labels. Mark up the SVG inside it:
 *
 * - `data-draw="n"`       stroke is drawn on during step n (line, path, rect…)
 * - `data-draw-fill="n"`  fill comes up once step n's strokes are mostly down
 * - `data-draw-fade="n"`  fades in with step n (labels, text)
 *
 * The server renders the finished diagram; it only un-draws itself when it's
 * still below the fold, and never under reduced motion.
 */
export function DrawSvg({
  trigger: triggerProp = "view",
  step = 90,
  duration = dur.slow,
  className,
  children,
}: {
  trigger?: Trigger;
  /** Milliseconds between steps. */
  step?: number;
  /** Milliseconds to draw one stroke. */
  duration?: number;
  className?: string;
  children: ReactNode;
}) {
  const trigger = useTriggerMode(triggerProp);
  const ref = useRef<HTMLDivElement>(null);

  useEntrance(ref, trigger, {
    prepare: (root) => {
      const { strokes, fills, fades } = collect(root);
      for (const { el, length } of strokes) {
        el.style.strokeDasharray = `${length} ${length}`;
        el.style.strokeDashoffset = `${length}`;
      }
      for (const { el } of fills) el.style.fillOpacity = "0";
      for (const { el } of fades) el.style.opacity = "0";
    },
    play: (root) => {
      const scale = timeScale();
      const { strokes, fills, fades } = collect(root);

      for (const { el, step: n, length } of strokes) {
        el.style.strokeDasharray = `${length} ${length}`;
        el.style.removeProperty("stroke-dashoffset");
        el.animate([{ strokeDashoffset: length }, { strokeDashoffset: 0 }], {
          duration: duration * scale,
          delay: n * step * scale,
          easing: ease.inOut,
          fill: "backwards",
        }).finished.then(
          () => el.style.removeProperty("stroke-dasharray"),
          () => el.style.removeProperty("stroke-dasharray"),
        );
      }
      for (const { el, step: n } of fills) {
        el.style.removeProperty("fill-opacity");
        el.animate([{ fillOpacity: 0 }, { fillOpacity: 1 }], {
          duration: dur.fast * scale,
          delay: (n * step + duration * 0.7) * scale,
          easing: "linear",
          fill: "backwards",
        });
      }
      for (const { el, step: n } of fades) {
        el.style.removeProperty("opacity");
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: dur.base * scale,
          delay: (n * step + duration * 0.4) * scale,
          easing: ease.out,
          fill: "backwards",
        });
      }
    },
  });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
