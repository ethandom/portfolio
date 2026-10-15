"use client";

import { useState } from "react";
import { DrawSvg, ScrambleText } from "@/components/motion";
import { Figure } from "@/components/manual";
import { Toggle, ToggleIndicator } from "@/components/ui/toggle";

const START = 0xb2;

/**
 * Fig. plate that plots itself in, then stays live: flip a relay and the byte
 * re-reads. Previews the Workbench relay board in 2D.
 */
export function RelayByte() {
  const [byte, setByte] = useState(START);
  const hex = byte.toString(16).toUpperCase().padStart(2, "0");
  const bits = Array.from({ length: 8 }, (_, i) => (byte >> (7 - i)) & 1);

  return (
    <Figure
      number={3}
      title="Relay byte"
      meta={<ScrambleText text={`0b${byte.toString(2).padStart(8, "0")}`} />}
      scroll
      note="Strokes plot first, then fills, then labels. Flip a relay below; the readout re-reads instead of snapping."
    >
      <div className="mx-auto grid w-full max-w-[560px] min-w-[30rem] gap-0">
        <DrawSvg>
          <svg
            viewBox="0 0 560 196"
            role="img"
            aria-label={`The byte 0x${hex} fans out to eight relays.`}
            className="block w-full font-mono"
          >
            <rect x="170" y="6" width="220" height="36" fill="var(--surface)" stroke="var(--diagram)" data-draw="0" />
            <text x="280" y="29" textAnchor="middle" fontSize="13" fill="var(--ink)" data-draw-fade="0">
              write(fd, 0x{hex})
            </text>
            <line x1="280" y1="42" x2="280" y2="70" stroke="var(--diagram)" data-draw="1" />
            <line x1="56" y1="70" x2="504" y2="70" stroke="var(--diagram)" data-draw="2" />
            {bits.map((bit, i) => {
              const cx = 56 + i * 64;
              const step = 3 + i * 0.5;
              return (
                <g key={i}>
                  <line x1={cx} y1="70" x2={cx} y2="98" stroke="var(--diagram)" data-draw={step} />
                  <rect
                    x={cx - 22}
                    y="98"
                    width="44"
                    height="44"
                    data-draw={step + 0.5}
                    data-draw-fill={step + 0.5}
                    data-closed={bit === 1}
                    className="transition-[fill,stroke] duration-(--dur-fast) ease-snap data-[closed=true]:animate-[led-warm_var(--dur-base)_linear]"
                    style={{
                      fill: bit ? "var(--accent)" : "var(--surface)",
                      stroke: bit ? "var(--accent)" : "var(--diagram)",
                    }}
                  />
                  <text
                    x={cx}
                    y="125"
                    textAnchor="middle"
                    fontSize="14"
                    fill={bit ? "var(--tape-ink)" : "var(--ink-muted)"}
                    data-draw-fade={step + 1}
                  >
                    {bit}
                  </text>
                  <text x={cx} y="166" textAnchor="middle" fontSize="11" fill="var(--ink-muted)" data-draw-fade={step + 1}>
                    K{7 - i}
                  </text>
                  <text x={cx} y="184" textAnchor="middle" fontSize="10" fill="var(--diagram)" data-draw-fade={step + 1}>
                    B{7 - i}
                  </text>
                </g>
              );
            })}
          </svg>
        </DrawSvg>
        <div role="group" aria-label="Relays" className="grid grid-cols-8 border border-strong bg-surface">
          {bits.map((bit, i) => (
            <Toggle
              key={i}
              size="sm"
              pressed={bit === 1}
              onPressedChange={() => setByte((b) => b ^ (1 << (7 - i)))}
              aria-label={`Relay K${7 - i}`}
              className="not-first:border-l-hairline"
            >
              <ToggleIndicator />K{7 - i}
            </Toggle>
          ))}
        </div>
      </div>
    </Figure>
  );
}
