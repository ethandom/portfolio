import type { ReactNode } from "react";
import { ChipList, Figure, SpecLabel, SpecTable } from "@/components/manual";
import { DrawSvg, Reveal } from "@/components/motion";
import { formatPeriod, type Project } from "@/lib/content";
import { ProjectLinks, ProjectStatus } from "./shared";

/** Mockup-only part numbers and the name printed on the package. */
const PART: Record<string, [code: string, marking: string]> = {
  conturo: ["CN-01", "CONTURO"],
  "usb-relay-driver": ["RL-02", "RELAY.KO"],
  tempr: ["TP-03", "TEMPR"],
  "chess-engine": ["CE-04", "CHESS"],
};

function Heading({ n, children }: { n: number; children: ReactNode }) {
  return (
    <h4 className="flex gap-3 border-b border-strong pb-2 font-mono text-label text-ink uppercase">
      <span className="text-ink-muted">{n}</span>
      {children}
    </h4>
  );
}

/**
 * The stack as a DIP package: pins run down the left and back up the right,
 * as on a real chip. An odd stack gets an NC (no-connect) pin.
 */
function Pinout({
  stack,
  marking,
  code,
}: {
  stack: string[];
  marking: string;
  code: string;
}) {
  const pins = stack.length % 2 ? [...stack, "NC"] : stack;
  const rows = pins.length / 2;
  const pitch = 40;
  const top = 16;
  const bodyH = rows * pitch + 28;
  const bodyX = 196;
  const bodyW = 120;
  const rowY = (r: number) => top + 30 + r * pitch;
  const h = top + bodyH + 16;

  return (
    <DrawSvg>
      <svg
        viewBox={`0 0 512 ${h}`}
        role="img"
        aria-label={`Pin configuration: ${stack.join(", ")}.`}
        className="mx-auto block w-full max-w-[34rem] min-w-[20rem] font-mono"
      >
        <path
          d={`M${bodyX} ${top} H${bodyX + 46} A14 14 0 0 0 ${bodyX + 74} ${top} H${bodyX + bodyW} V${top + bodyH} H${bodyX} Z`}
          fill="var(--surface)"
          stroke="var(--diagram)"
          data-draw="0"
          data-draw-fill="0"
        />
        <circle
          cx={bodyX + 16}
          cy={top + 16}
          r="3"
          fill="var(--diagram)"
          data-draw-fade="1"
        />
        <text
          transform={`translate(${bodyX + bodyW / 2} ${top + bodyH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="16"
          letterSpacing="2"
          fill="var(--ink)"
          data-draw-fade="1"
        >
          {marking}
        </text>
        <text
          transform={`translate(${bodyX + bodyW / 2 + 22} ${top + bodyH / 2}) rotate(-90)`}
          textAnchor="middle"
          fontSize="11"
          fill="var(--ink-muted)"
          data-draw-fade="1"
        >
          {code} · EAC
        </text>
        {pins.map((name, i) => {
          const left = i < rows;
          const r = left ? i : pins.length - 1 - i;
          const y = rowY(r);
          const nc = name === "NC";
          const step = 1 + r * 0.4;
          return (
            <g key={`${name}-${i}`}>
              <rect
                x={left ? bodyX - 24 : bodyX + bodyW}
                y={y - 5}
                width="24"
                height="10"
                fill={nc ? "var(--surface)" : "var(--sunken)"}
                stroke="var(--diagram)"
                data-draw={step}
                data-draw-fill={step}
              />
              <text
                x={left ? bodyX + 8 : bodyX + bodyW - 8}
                y={y + 3.5}
                textAnchor={left ? "start" : "end"}
                fontSize="12"
                fill="var(--diagram)"
                data-draw-fade={step}
              >
                {i + 1}
              </text>
              <text
                x={left ? bodyX - 32 : bodyX + bodyW + 32}
                y={y + 4}
                textAnchor={left ? "end" : "start"}
                fontSize="15"
                fill={nc ? "var(--ink-muted)" : "var(--ink)"}
                data-draw-fade={step + 0.5}
              >
                {name.toUpperCase()}
              </text>
            </g>
          );
        })}
      </svg>
    </DrawSvg>
  );
}

/**
 * Mockup C — the component datasheet. Each project is a part: a front page
 * with features and applications on the left, the stack as a pinout and the
 * metrics as absolute ratings on the right.
 */
export function Datasheet({
  project,
  figure,
}: {
  project: Project;
  figure: number;
}) {
  const [code, marking] = PART[project.slug] ?? [
    "XX-00",
    project.title.toUpperCase(),
  ];

  return (
    <Reveal>
      <article
        aria-labelledby={`sheet-${project.slug}`}
        className="border border-strong bg-surface"
      >
        <header className="grid grid-cols-1 gap-4 border-b border-strong p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:p-8">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <SpecLabel tone="inverse">{code}</SpecLabel>
              <SpecLabel>{formatPeriod(project.period)}</SpecLabel>
            </div>
            <h3
              id={`sheet-${project.slug}`}
              className="mt-4 text-xl font-light"
            >
              {project.title}
            </h3>
            <p className="mt-3 max-w-(--measure) text-lg text-ink-muted">
              {project.summary}
            </p>
          </div>
          <ProjectStatus project={project} />
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="grid content-start gap-10 p-5 sm:p-8 lg:border-r lg:border-hairline">
            <section>
              <Heading n={1}>Features</Heading>
              <ul className="mt-4 grid gap-4">
                {project.highlights.map((line) => (
                  <li
                    key={line}
                    className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-3 text-base"
                  >
                    <span aria-hidden className="mt-2.5 size-1.5 bg-accent" />
                    <span className="max-w-(--measure)">{line}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <Heading n={2}>Applications</Heading>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <ChipList items={project.kind} variant="solid" label="Kind" />
                {project.role && <SpecLabel>{project.role}</SpecLabel>}
              </div>
            </section>
            <ProjectLinks project={project} />
          </div>

          <div className="grid min-w-0 content-start gap-10 border-t border-hairline p-5 sm:p-8 lg:border-t-0">
            {project.stack.length > 0 && (
              <section className="grid grid-cols-1 gap-4">
                <Heading n={3}>Pin configuration</Heading>
                <Figure
                  number={figure}
                  title={`${code} · DIP-${project.stack.length + (project.stack.length % 2)}`}
                  meta="Top view"
                  scroll
                  bodyClassName="px-3 py-6 sm:px-4"
                >
                  <Pinout stack={project.stack} marking={marking} code={code} />
                </Figure>
              </section>
            )}
            {project.metrics.length > 0 && (
              <section>
                <Heading n={4}>Absolute ratings</Heading>
                <SpecTable rows={project.metrics} className="mt-2" />
              </section>
            )}
          </div>
        </div>

        <footer className="flex justify-between gap-4 border-t border-hairline px-5 py-2 font-mono text-label text-ink-muted uppercase sm:px-8">
          <span>Datasheet {code}</span>
          <span>Rev. 2026.10</span>
        </footer>
      </article>
    </Reveal>
  );
}
