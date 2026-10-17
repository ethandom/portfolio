"use client";

import { useEffect, useState } from "react";
import { Kbd } from "@/components/manual";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { PANEL_IDS, type PanelId, type Panels } from "@/features/workbench";
// Lab files reach into a feature by path: the panel shell isn't public API.
import { StationPanel } from "@/features/workbench/components/station-panel";
import { DUSK } from "@/features/workbench/lib/palette";
import { PANEL_SIDE } from "@/features/workbench/lib/panels";

const LABELS: Record<PanelId, string> = {
  reading: "Reading",
  conturo: "Conturo",
  skills: "Skills",
  google: "Google",
  relay: "Relay",
};

/**
 * Each Workbench panel open over a stand-in for the scene (a dusk window
 * wall, warm lamps), with the scene's own chrome: the station keys top left
 * and the Back key bottom right. Pick a panel, or clear the pick (or press
 * Esc) to watch it leave.
 */
export function PanelSpecimen({ panels }: { panels: Panels }) {
  const [open, setOpen] = useState<PanelId | null>("conturo");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      data-theme="dark"
      style={{ background: DUSK }}
      className="relative h-dvh w-full overflow-hidden text-ink"
    >
      <h1 className="sr-only">Workbench panels</h1>
      <Backdrop />

      <div className="absolute top-4 left-4 grid max-w-[calc(100vw-2rem)] gap-2">
        <ToggleGroup
          type="single"
          size="sm"
          value={open ?? ""}
          onValueChange={(v) => setOpen((v || null) as PanelId | null)}
          aria-label="Open panel"
          className="flex-wrap bg-bg"
        >
          {PANEL_IDS.map((id) => (
            <ToggleGroupItem key={id} value={id} disabled={!panels[id]}>
              {LABELS[id]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="font-mono text-label text-ink-muted uppercase">
          Specimen · Esc or the active key closes
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(null)}
        className="absolute right-4 bottom-4 bg-bg"
      >
        Back
        <Kbd>Esc</Kbd>
      </Button>

      <StationPanel
        content={open ? (panels[open] ?? null) : null}
        onClose={() => setOpen(null)}
        side={(open && PANEL_SIDE[open]) ?? "right"}
      />
    </div>
  );
}

/**
 * The scene, roughly: a dusk sky through a steel window wall over a
 * skyline, a bench edge and a couple of warm lamps. Enough color and
 * contrast behind the panel to judge its translucency.
 */
function Backdrop() {
  const towers = [
    [40, 520, 90],
    [150, 610, 70],
    [240, 470, 110],
    [380, 560, 80],
    [470, 430, 60],
    [560, 590, 120],
    [700, 500, 90],
    [820, 640, 70],
    [910, 450, 100],
    [1040, 560, 80],
    [1140, 520, 110],
    [1280, 600, 70],
    [1370, 480, 90],
    [1490, 570, 110],
  ];
  return (
    <svg
      aria-hidden
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <defs>
        <linearGradient id="specimen-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2147" />
          <stop offset="0.35" stopColor="#3b3a6e" />
          <stop offset="0.58" stopColor="#b9809b" />
          <stop offset="0.72" stopColor="#f2c197" />
        </linearGradient>
        <radialGradient id="specimen-lamp">
          <stop offset="0" stopColor="#ffb36b" stopOpacity="0.7" />
          <stop offset="1" stopColor="#ffb36b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="720" fill="url(#specimen-sky)" />
      {towers.map(([x, top, w]) => (
        <g key={x}>
          <rect x={x} y={top} width={w} height={720 - top} fill="#12152a" />
          {Array.from({ length: 5 }, (_, i) => (
            <rect
              key={i}
              x={x + 12 + ((i * 23) % (w - 24))}
              y={top + 24 + i * 34}
              width="8"
              height="5"
              fill="#f6c27a"
              opacity="0.7"
            />
          ))}
        </g>
      ))}
      {/* Window mullions, the ceiling, then the floor and the bench. */}
      {[0, 400, 800, 1200, 1600].map((x) => (
        <rect key={x} x={x - 9} y="0" width="18" height="720" fill="#0d0f17" />
      ))}
      <rect y="300" width="1600" height="12" fill="#0d0f17" />
      <rect width="1600" height="90" fill="#141210" />
      <rect y="720" width="1600" height="280" fill="#2a1d15" />
      <rect x="180" y="640" width="900" height="26" fill="#0f0f12" />
      <rect x="200" y="666" width="18" height="250" fill="#0f0f12" />
      <rect x="1040" y="666" width="18" height="250" fill="#0f0f12" />
      <rect x="620" y="560" width="200" height="80" fill="#0b0c10" />
      <rect
        x="630"
        y="568"
        width="180"
        height="62"
        fill="#ff6a2b"
        opacity="0.35"
      />
      <circle cx="1180" cy="520" r="220" fill="url(#specimen-lamp)" />
      <circle cx="430" cy="600" r="160" fill="url(#specimen-lamp)" />
    </svg>
  );
}
