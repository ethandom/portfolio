"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArrowsSplitIcon,
  DatabaseIcon,
  LightningIcon,
  PlayIcon,
  TrayIcon,
  type IconProps,
} from "@phosphor-icons/react";
import { Figure } from "@/components/manual";
import { prefersReducedMotion, timeScale } from "@/components/motion/preference";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { StackMark } from "../../projects/_components/stack-marks";

/*
 * The data pipeline as a workflow canvas, in the manner of a node editor:
 * each node is a step, shown by the tool that does it, wired output to
 * input. Every fetcher can feed every parser, so those two columns
 * cross-wire. Executing it sends one example record down its route and
 * prints the record under the canvas as each step changes it. Sources are
 * named by kind only, never by site (see the data-source rule).
 */

const TILE = 56;
const PITCH = 116;
const PAD = 32;
const LANE = { top: 50, mid: 110, bottom: 170 } as const;
const WIDTH = 2 * PAD + 6 * PITCH + TILE;
const HEIGHT = 226;

type Node = {
  id: string;
  col: number;
  lane: keyof typeof LANE;
  name: string;
  /** A StackMark name, or an icon on an ink tile for steps that are not one tool. */
  mark?: string;
  Icon?: ComponentType<IconProps>;
};

const NODES: Node[] = [
  { id: "run", col: 0, lane: "mid", name: "Run", Icon: LightningIcon },
  { id: "fetch", col: 1, lane: "top", name: "HTTP fetch", mark: "Python" },
  { id: "browser", col: 1, lane: "bottom", name: "Browser", mark: "Playwright" },
  { id: "parse", col: 2, lane: "top", name: "Parse HTML", mark: "Beautiful Soup" },
  { id: "extract", col: 2, lane: "bottom", name: "AI extract", mark: "ChatGPT" },
  { id: "normalize", col: 3, lane: "mid", name: "Normalize", mark: "Python" },
  { id: "classify", col: 4, lane: "mid", name: "Classify", mark: "Machine Learning" },
  { id: "gate", col: 5, lane: "mid", name: "Confidence", Icon: ArrowsSplitIcon },
  { id: "directory", col: 6, lane: "top", name: "Directory", Icon: DatabaseIcon },
  { id: "held", col: 6, lane: "bottom", name: "Held", Icon: TrayIcon },
];

const BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));

/** [from, to, which gate output it leaves from]. */
const EDGES: [string, string, ("true" | "false")?][] = [
  ["run", "fetch"],
  ["run", "browser"],
  ["fetch", "parse"],
  ["fetch", "extract"],
  ["browser", "parse"],
  ["browser", "extract"],
  ["parse", "normalize"],
  ["extract", "normalize"],
  ["normalize", "classify"],
  ["classify", "gate"],
  ["gate", "directory", "true"],
  ["gate", "held", "false"],
];

type Field = [label: string, value: string];

type Example = { node: string; fields: Field[] }[];

/**
 * The example records (illustrative), and what each step on a record's route
 * makes of it. A route is the nodes listed, in order. Runs alternate between
 * them: one the classifier is sure of, one it is not.
 */
const EXAMPLES: Example[] = [
  [
    {
      node: "run",
      fields: [["html", "<tr><td>Lee, Robert</td><td>Algebra I / Asst. Coach</td><td>rlee@…</td></tr>"]],
    },
    { node: "fetch", fields: [["request", "GET"], ["status", "200"], ["rendered", "on the server"]] },
    { node: "parse", fields: [["name", "Lee, Robert"], ["title", "Algebra I / Asst. Coach"], ["email", "rlee@…"]] },
    { node: "normalize", fields: [["name", "Robert Lee"], ["job key", "algebra i"], ["duty", "coach"]] },
    {
      node: "classify",
      fields: [["role", "Teacher + Coach"], ["subject", "Math"], ["grade", "09–12"], ["p", "0.96"]],
    },
    { node: "gate", fields: [["check", "0.96 ≥ 0.90"], ["output", "true"]] },
    { node: "directory", fields: [["record", "applied"]] },
  ],
  [
    {
      node: "run",
      fields: [["html", '<div class="profile">Ms. Ana Ruiz · Team Lead, 6th · aruiz@…</div>']],
    },
    { node: "browser", fields: [["request", "headless"], ["waited", "scripts settled"], ["popups", "1"]] },
    { node: "extract", fields: [["name", "Ms. Ana Ruiz"], ["title", "Team Lead, 6th"], ["email", "aruiz@…"]] },
    { node: "normalize", fields: [["name", "Ana Ruiz"], ["job key", "team lead 6th"]] },
    { node: "classify", fields: [["role", "Teacher"], ["subject", "none"], ["grade", "06"], ["p", "0.71"]] },
    { node: "gate", fields: [["check", "0.71 < 0.90"], ["output", "false"]] },
    { node: "held", fields: [["record", "kept as it was, logged"]] },
  ],
];

const left = (n: Node) => PAD + n.col * PITCH;
const cy = (n: Node) => LANE[n.lane];
const GATE_PORT = { true: -12, false: 12 };

function wire(from: Node, to: Node, port?: "true" | "false") {
  const x1 = left(from) + TILE;
  const y1 = cy(from) + (port ? GATE_PORT[port] : 0);
  const x2 = left(to);
  const y2 = cy(to);
  const dx = (x2 - x1) / 2;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

/** Each step starts STEP after the last; it runs for RUN, then its wire carries the record on. */
const STEP = 760;
const RUN = 420;
const END = (EXAMPLES[0].length - 1) * STEP + RUN;

type NodeState = "idle" | "running" | "done" | "off";

/**
 * Fig. for the Center for Puppetry Arts: the data pipeline as a workflow.
 * Execute it to watch an example record go from HTML to the directory, or
 * be held when the classifier is unsure.
 */
export function WorkflowFigure({ number }: { number: number }) {
  /** Milliseconds into the run; null before the first one. */
  const [t, setT] = useState<number | null>(null);
  /** Runs so far; the record alternates with each one. */
  const [runs, setRuns] = useState(0);
  const frame = useRef(0);

  function execute() {
    cancelAnimationFrame(frame.current);
    setRuns((r) => r + 1);
    if (prefersReducedMotion()) {
      setT(Infinity);
      return;
    }
    const begin = performance.now();
    const scale = timeScale();
    const tick = (stamp: number) => {
      const next = Math.max(0, (stamp - begin) / scale);
      setT(next);
      if (next < END) frame.current = requestAnimationFrame(tick);
    };
    setT(0);
    frame.current = requestAnimationFrame(tick);
  }

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const ran = t !== null;
  const clock = t ?? -1;
  const example = EXAMPLES[(Math.max(runs, 1) - 1) % EXAMPLES.length];
  const route = new Set(example.map((s) => s.node));
  const step = (id: string) => example.findIndex((s) => s.node === id);
  const start = (id: string) => step(id) * STEP;
  const state = (n: Node): NodeState => {
    if (!ran) return "idle";
    if (!route.has(n.id)) return "off";
    if (clock < start(n.id)) return "idle";
    return clock < start(n.id) + RUN ? "running" : "done";
  };
  /** How far the record has carried along a wire, 0 to 1. */
  const carried = (a: string, b: string) => {
    if (!route.has(a) || !route.has(b) || step(b) !== step(a) + 1) return 0;
    return Math.max(0, Math.min(1, (clock - start(a) - RUN) / (STEP - RUN)));
  };
  /** Rows printed so far: the input shows at once, each step's row once it has run. */
  const printed = example.filter(
    (s, k) => clock >= start(s.node) + (k === 0 ? 0 : RUN),
  ).length;
  const done = clock >= END;

  return (
    <Figure
      number={number}
      title="Data pipeline"
      meta={!ran ? `${NODES.length} nodes` : done ? `run ok · ${example[example.length - 1].node === "held" ? "held" : "applied"}` : `step ${printed}/${example.length}`}
      scroll
      note="Rule parsers take the layouts they know and an AI reads the rest; a change reaches the directory only when the classifier is sure of it."
    >
      <div className="mx-auto grid w-fit gap-6">
        <div className="relative" style={{ width: WIDTH, height: HEIGHT }}>
          <svg aria-hidden width={WIDTH} height={HEIGHT} className="pointer-events-none absolute inset-0 font-mono">
            {EDGES.map(([a, b, port]) => {
              const d = wire(BY_ID[a], BY_ID[b], port);
              const k = carried(a, b);
              return (
                <g key={`${a}-${b}`}>
                  <path d={d} fill="none" stroke="var(--rule)" strokeWidth={1.25} />
                  <path
                    d={d}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    pathLength={1}
                    strokeDasharray="1 1"
                    strokeDashoffset={1 - k}
                    opacity={k > 0 ? 1 : 0}
                  />
                  {port && <EdgeTag edge={[BY_ID[a], BY_ID[b]]} port={port} />}
                </g>
              );
            })}
          </svg>
          {NODES.map((n) => (
            <NodeTile key={n.id} node={n} state={state(n)} />
          ))}
          <svg aria-hidden width={WIDTH} height={HEIGHT} className="pointer-events-none absolute inset-0">
            {NODES.map((n) => (
              <g key={n.id}>
                {n.col > 0 && <Port x={left(n)} y={cy(n)} />}
                {n.id === "gate" ? (
                  <>
                    <Port x={left(n) + TILE} y={cy(n) + GATE_PORT.true} />
                    <Port x={left(n) + TILE} y={cy(n) + GATE_PORT.false} />
                  </>
                ) : (
                  n.col < 6 && <Port x={left(n) + TILE} y={cy(n)} />
                )}
              </g>
            ))}
          </svg>
        </div>

        {/* The canvas scrolls sideways on phones; the button stays in view. */}
        <div className="sticky left-0 flex w-[min(100%,calc(100vw-5.25rem))] justify-end border-t border-hairline pt-4">
          <Button variant="outline" size="sm" onClick={execute}>
            <PlayIcon weight="light" />
            Execute workflow
          </Button>
        </div>

        {/* The record, printed as each step changes it. Opens on the first run. */}
        <div
          inert={!ran}
          className="grid grid-cols-1 transition-[grid-template-rows] duration-(--dur-slow) ease-out"
          style={{ gridTemplateRows: ran ? "1fr" : "0fr" }}
        >
          <div className="min-h-0 overflow-hidden">
            <ol aria-label="The example record at each step" className="grid border-t border-strong">
              {example.map(({ node, fields }, k) => {
                const shown = k < printed;
                const current = shown && k === printed - 1 && !done;
                return (
                  <li
                    key={node}
                    className={cn(
                      "grid grid-cols-[7.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-hairline py-1.5 transition-opacity duration-(--dur-base) ease-out",
                      !shown && "opacity-0",
                    )}
                  >
                    <span className="flex items-center gap-2 font-mono text-label text-ink-muted uppercase">
                      <span aria-hidden className={cn("size-1.5", current ? "bg-accent" : "bg-ink")} />
                      {k === 0 ? "Input" : BY_ID[node].name}
                    </span>
                    <span className="flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-sm">
                      {fields.map(([label, value]) => (
                        <span key={label} className={cn(k > 0 && "whitespace-nowrap")}>
                          <span className="text-ink-muted">{label} </span>
                          <span className="text-ink">{value}</span>
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </Figure>
  );
}

/** A gate output's name, boxed at the middle of its wire so the curve runs behind it. */
function EdgeTag({ edge: [from, to], port }: { edge: [Node, Node]; port: "true" | "false" }) {
  // A symmetric cubic passes through the midpoint of its ends.
  const x = (left(from) + TILE + left(to)) / 2;
  const y = (cy(from) + GATE_PORT[port] + cy(to)) / 2;
  const w = port.length * 5.6 + 10;
  return (
    <g>
      <rect x={x - w / 2} y={y - 6.5} width={w} height={13} fill="var(--surface)" stroke="var(--rule)" />
      <text x={x} y={y + 3} textAnchor="middle" fontSize="8" letterSpacing="0.06em" fill="var(--ink-muted)">
        {port.toUpperCase()}
      </text>
    </g>
  );
}

function Port({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.5} fill="var(--surface)" stroke="var(--strong)" strokeWidth={1} />;
}

/** A node: the tool's keycap (or an ink tile) with the step's name under it. */
function NodeTile({ node, state }: { node: Node; state: NodeState }) {
  const { Icon } = node;
  return (
    <div
      className={cn(
        "absolute grid w-28 justify-items-center gap-2 text-center transition-opacity duration-(--dur-base)",
        state === "off" && "opacity-40",
      )}
      style={{ left: left(node) + TILE / 2 - 56, top: cy(node) - TILE / 2 }}
    >
      <span
        className={cn(
          "relative block outline outline-offset-3 outline-transparent transition-[outline-color] duration-(--dur-fast)",
          state === "running" && "outline-2 outline-accent",
        )}
      >
        {node.mark ? (
          <StackMark name={node.mark} className="size-14 [&_svg]:size-7" />
        ) : (
          Icon && (
            <span className="grid size-14 place-items-center rounded-xs bg-inverse text-ink-inverse">
              <Icon weight="light" className="size-7" />
            </span>
          )
        )}
        <span
          aria-hidden
          className={cn(
            "absolute -top-1 -right-1 size-2 border transition-colors duration-(--dur-fast)",
            state === "running" || state === "done"
              ? "border-surface bg-accent"
              : "border-transparent bg-transparent",
            state === "running" && "animate-pulse",
          )}
        />
      </span>
      <span className="bg-surface px-1.5 text-sm leading-tight whitespace-nowrap text-ink">{node.name}</span>
    </div>
  );
}
