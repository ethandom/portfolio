"use client";

import { useState } from "react";
import { PlayIcon } from "@phosphor-icons/react";
import { DrawSvg } from "@/components/motion";
import { SpecLabel } from "@/components/manual";
import { Button } from "@/components/ui/button";
import { ease } from "@/lib/motion/presets";

const CURVES = [
  { token: "--ease-out", value: ease.out, use: "Entrances, hovers, prints" },
  { token: "--ease-in-out", value: ease.inOut, use: "Rules, plots, mode switches" },
  { token: "--ease-snap", value: ease.snap, use: "Relays and latches" },
] as const;

function bezier(value: string) {
  const [x1, y1, x2, y2] = value.match(/-?[\d.]+/g)!.map(Number);
  // Plot area: 0..80 on both axes, with headroom above for snap's overshoot.
  const px = (x: number) => 8 + x * 80;
  const py = (y: number) => 104 - y * 80;
  return `M${px(0)} ${py(0)} C${px(x1)} ${py(y1)} ${px(x2)} ${py(y2)} ${px(1)} ${py(1)}`;
}

/** Each easing token plotted as a curve, then run on a track at --dur-slow. */
export function EasingTracks() {
  const [atEnd, setAtEnd] = useState(false);

  return (
    <div className="grid grid-cols-1 gap-3">
      <ul className="border-t border-hairline">
        {CURVES.map((curve, i) => (
          <li
            key={curve.token}
            className="grid grid-cols-[6rem_1fr] items-center gap-x-4 gap-y-3 border-b border-hairline py-4 sm:grid-cols-[6rem_14rem_1fr]"
          >
            <DrawSvg className="row-span-2 sm:row-span-1">
              <svg viewBox="0 0 96 112" className="block w-24" role="img" aria-label={`${curve.token} curve`}>
                <rect x="8" y="24" width="80" height="80" fill="none" stroke="var(--hairline)" />
                <line x1="8" y1="104" x2="88" y2="24" stroke="var(--hairline)" strokeDasharray="2 3" />
                <path
                  d={bezier(curve.value)}
                  fill="none"
                  stroke="var(--diagram)"
                  strokeWidth="1.5"
                  data-draw={i}
                />
              </svg>
            </DrawSvg>
            <div className="grid gap-1">
              <SpecLabel tone="ink">{curve.token}</SpecLabel>
              <span className="text-sm text-ink-muted">{curve.use}</span>
            </div>
            <div className="@container relative h-6 border-b border-rule">
              <span
                aria-hidden
                className="absolute bottom-0 left-0 size-3 bg-accent"
                style={{
                  transform: atEnd ? "translateX(calc(100cqw - 100%))" : "none",
                  transition: `transform var(--dur-slow) ${curve.value}`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setAtEnd((v) => !v)}>
          <PlayIcon weight="light" />
          Run at --dur-slow
        </Button>
      </div>
    </div>
  );
}
