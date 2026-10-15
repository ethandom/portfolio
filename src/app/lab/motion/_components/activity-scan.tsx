"use client";

import { useState } from "react";
import { ScrambleText } from "@/components/motion";
import { Figure } from "@/components/manual";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type Source = "both" | "github" | "leetcode";

const WEEKS = 53;
const RAMP = [0, 25, 50, 75, 100];
const SEED: Record<Exclude<Source, "both">, number> = { github: 12.9898, leetcode: 78.233 };

/** Deterministic sample levels, so the specimen is stable between renders. */
function level(i: number, seed: number) {
  const x = Math.sin(i * seed) * 43758.5453;
  const r = x - Math.floor(x);
  return r < 0.35 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : r < 0.93 ? 3 : 4;
}

function levels(source: Source) {
  return Array.from({ length: WEEKS * 7 }, (_, i) =>
    source === "both"
      ? Math.min(4, level(i, SEED.github) + (level(i, SEED.leetcode) >> 1))
      : level(i, SEED[source]),
  );
}

/**
 * Switching the source re-levels the calendar as a left-to-right scan,
 * one column every 4ms, so the change reads as the same instrument re-reading.
 */
export function ActivityScan() {
  const [source, setSource] = useState<Source>("both");
  const cells = levels(source);
  const total = cells.reduce((sum, n) => sum + n, 0);

  return (
    <Figure
      number={4}
      title="Activity · source switch"
      scroll
      grid={false}
      meta={
        <ToggleGroup
          type="single"
          size="sm"
          value={source}
          onValueChange={(v) => v && setSource(v as Source)}
          aria-label="Activity source"
        >
          <ToggleGroupItem value="both">Both</ToggleGroupItem>
          <ToggleGroupItem value="github">GitHub</ToggleGroupItem>
          <ToggleGroupItem value="leetcode">LeetCode</ToggleGroupItem>
        </ToggleGroup>
      }
      note={
        <span className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span>Sample data. The switch&apos;s lamp warms up; the cells re-level as a scan.</span>
          <span className="font-mono text-label uppercase">
            Total <ScrambleText text={String(total).padStart(4, "0")} />
          </span>
        </span>
      }
    >
      <svg
        viewBox={`0 0 ${WEEKS * 12} ${7 * 12}`}
        role="img"
        aria-label={`Sample ${source} activity heatmap, 53 weeks by 7 days`}
        className="block w-[636px] max-w-none"
      >
        {cells.map((n, i) => {
          const week = Math.floor(i / 7);
          return (
            <rect
              key={i}
              x={week * 12}
              y={(i % 7) * 12}
              width="10"
              height="10"
              style={{
                fill: `color-mix(in oklab, var(--accent) ${RAMP[n]}%, var(--sunken))`,
                transition: "fill var(--dur-base) var(--ease-out)",
                transitionDelay: `calc(${week * 4}ms * var(--motion-scale))`,
              }}
            />
          );
        })}
      </svg>
    </Figure>
  );
}
