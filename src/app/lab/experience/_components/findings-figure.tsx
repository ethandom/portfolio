"use client";

import { useRef, useState } from "react";
import { Figure } from "@/components/manual";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFirstView } from "./use-first-view";

/** Mentors by role, never by name. */
const MENTORS = [
  { id: "partner", label: "Principal partner", short: "Partner" },
  { id: "advisors", label: "Financial advisors", short: "Advisors" },
  { id: "security", label: "Security officers", short: "Security" },
] as const;
type Mentor = (typeof MENTORS)[number]["id"];

/* Placeholder themes until Ethan names the real findings. */
const FINDINGS: { label: string; from: Mentor[] }[] = [
  { label: "Client service", from: ["partner", "advisors"] },
  { label: "Advisor workflow", from: ["advisors"] },
  { label: "Security & controls", from: ["security"] },
  { label: "Operating cost", from: ["partner", "security"] },
];

const M_Y = [40, 98, 156];
const F_Y = [18, 70, 122, 174];
const M_RIGHT = 150;
const F_LEFT = 204;
const F_RIGHT = 388;
const P = { x: 440, y: 52, w: 112, h: 124 };
const P_MID = P.y + P.h / 2;

const STEP = 140;
const delay = (step: number, extra = 0) =>
  `calc(${step * STEP + extra}ms * var(--motion-scale))`;
/** Highlight changes on a traced path stay quick. */
const TRACE = "stroke var(--dur-fast), stroke-opacity var(--dur-fast)";

/**
 * Plotter-style drawing without measuring paths: pathLength="1" makes every
 * stroke one unit long, so a dash offset of 1 hides it and 0 draws it.
 */
function plot(drawn: boolean, step: number) {
  return {
    pathLength: 1,
    strokeDasharray: 1,
    strokeDashoffset: drawn ? 0 : 1,
    style: {
      transition: `stroke-dashoffset var(--dur-slow) var(--ease-in-out) ${delay(step)}, ${TRACE}`,
    },
  };
}

function fade(drawn: boolean, step: number) {
  return {
    style: {
      opacity: drawn ? 1 : 0,
      transition: `opacity var(--dur-base) var(--ease-out) ${delay(step, 240)}`,
    },
  };
}

/**
 * Fig. for the Merrill Lynch apprenticeship: what each mentor taught, traced
 * into the findings and bound into one analysis portfolio.
 */
export function FindingsFigure({ number }: { number: number }) {
  const [trace, setTrace] = useState<"all" | Mentor>("all");
  const lit = (from: Mentor[]) => trace === "all" || from.includes(trace);
  const [drawn, setDrawn] = useState(true);
  const ref = useRef<HTMLDivElement>(null);
  useFirstView(ref, { hide: () => setDrawn(false), play: () => setDrawn(true) });

  return (
    <Figure
      number={number}
      title="Analysis portfolio"
      meta={`${MENTORS.length} mentors · ${FINDINGS.length} findings · 1 review`}
      scroll
      note="What each mentor taught, traced into the findings and bound into one analysis for review. Finding themes are placeholders."
    >
      <div ref={ref} className="mx-auto grid w-full max-w-[560px] min-w-[32rem] gap-4">
          <svg
            viewBox="0 0 560 230"
            role="img"
            aria-label={`Three mentors, a principal partner, financial advisors and security officers, feed ${FINDINGS.length} findings, which bind into one analysis portfolio presented to mentors.`}
            className="block w-full font-mono"
          >
            {/* Mentor → finding */}
            {FINDINGS.flatMap((f, fi) =>
              f.from.map((m) => {
                const mi = MENTORS.findIndex((x) => x.id === m);
                const y1 = M_Y[mi] + 17;
                const y2 = F_Y[fi] + 15;
                const on = trace === "all" || trace === m;
                return (
                  <path
                    key={`${m}-${fi}`}
                    d={`M${M_RIGHT},${y1} C${M_RIGHT + 36},${y1} ${F_LEFT - 36},${y2} ${F_LEFT},${y2}`}
                    fill="none"
                    stroke={on && trace !== "all" ? "var(--accent)" : "var(--diagram)"}
                    strokeOpacity={on ? 1 : 0.25}
                    {...plot(drawn, 1)}
                  />
                );
              }),
            )}
            {/* Finding → portfolio */}
            {FINDINGS.map((f, fi) => {
              const y = F_Y[fi] + 15;
              return (
                <path
                  key={`p-${fi}`}
                  d={`M${F_RIGHT},${y} C${F_RIGHT + 34},${y} ${P.x - 34},${P_MID} ${P.x},${P_MID}`}
                  fill="none"
                  stroke="var(--diagram)"
                  strokeOpacity={lit(f.from) ? 1 : 0.25}
                  {...plot(drawn, 3)}
                />
              );
            })}

            {MENTORS.map((m, mi) => {
              const on = trace === "all" || trace === m.id;
              return (
                <g key={m.id} opacity={on ? 1 : 0.4} className="transition-opacity duration-(--dur-fast)">
                  <rect
                    x={8}
                    y={M_Y[mi]}
                    width={M_RIGHT - 8}
                    height={34}
                    fill={trace === m.id ? "var(--inverse)" : "var(--surface)"}
                    stroke="var(--strong)"
                    {...plot(drawn, 0)}
                  />
                  <text
                    x={18}
                    y={M_Y[mi] + 21}
                    fontSize="11"
                    fill={trace === m.id ? "var(--ink-inverse)" : "var(--ink)"}
                    {...fade(drawn, 0)}
                  >
                    {m.label}
                  </text>
                </g>
              );
            })}

            {FINDINGS.map((f, fi) => (
              <g key={f.label} opacity={lit(f.from) ? 1 : 0.4} className="transition-opacity duration-(--dur-fast)">
                <rect
                  x={F_LEFT}
                  y={F_Y[fi]}
                  width={F_RIGHT - F_LEFT}
                  height={30}
                  fill="var(--surface)"
                  stroke="var(--diagram)"
                  {...plot(drawn, 2)}
                />
                <text x={F_LEFT + 10} y={F_Y[fi] + 19} fontSize="10" fill="var(--ink-muted)" {...fade(drawn, 2)}>
                  F-{String(fi + 1).padStart(2, "0")}
                </text>
                <text x={F_LEFT + 46} y={F_Y[fi] + 19} fontSize="11" fill="var(--ink)" {...fade(drawn, 2)}>
                  {f.label}
                </text>
              </g>
            ))}

            {/* The bound portfolio: a stack of pages behind a cover. */}
            <rect x={P.x + 8} y={P.y - 8} width={P.w} height={P.h} fill="var(--sunken)" stroke="var(--rule)" {...plot(drawn, 4)} />
            <rect x={P.x + 4} y={P.y - 4} width={P.w} height={P.h} fill="var(--sunken)" stroke="var(--rule)" {...plot(drawn, 4)} />
            <rect x={P.x} y={P.y} width={P.w} height={P.h} fill="var(--surface)" stroke="var(--strong)" {...plot(drawn, 4)} />
            <rect x={P.x} y={P.y} width={8} height={P.h} fill="var(--accent)" {...fade(drawn, 5)} />
            <text x={P.x + 18} y={P.y + 26} fontSize="10" fill="var(--ink-muted)" {...fade(drawn, 5)}>
              ANALYSIS
            </text>
            <text x={P.x + 18} y={P.y + 40} fontSize="10" fill="var(--ink-muted)" {...fade(drawn, 5)}>
              PORTFOLIO
            </text>
            {[0, 1, 2, 3].map((i) => (
              <line
                key={i}
                x1={P.x + 18}
                x2={P.x + P.w - 14 - (i % 2) * 22}
                y1={P.y + 62 + i * 12}
                y2={P.y + 62 + i * 12}
                stroke="var(--rule)"
                {...plot(drawn, 5)}
              />
            ))}
            <line x1={P.x + P.w / 2} y1={P.y + P.h} x2={P.x + P.w / 2} y2={206} stroke="var(--diagram)" {...plot(drawn, 6)} />
            <text x={P.x + P.w / 2} y={222} textAnchor="middle" fontSize="10" fill="var(--ink)" {...fade(drawn, 6)}>
              → MENTOR REVIEW
            </text>
          </svg>

        <ToggleGroup
          type="single"
          size="sm"
          value={trace}
          onValueChange={(v) => v && setTrace(v as typeof trace)}
          aria-label="Trace a mentor"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          {MENTORS.map((m) => (
            <ToggleGroupItem key={m.id} value={m.id}>
              {m.short}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </Figure>
  );
}
