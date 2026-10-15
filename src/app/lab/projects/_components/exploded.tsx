"use client";

import { useState } from "react";
import { ChipList, Figure, SpecLabel, SpecTable } from "@/components/manual";
import { DrawSvg, Reveal } from "@/components/motion";
import type { Project } from "@/lib/content";
import { DIAGRAMS, NODE_H, type DiagramNode } from "./exploded-diagrams";
import { ProjectLinks, ProjectStatus, entryNo } from "./shared";

/** Numbered square callout tag, the way a parts diagram labels a component. */
function Tag({
  n,
  x,
  y,
  lit,
}: {
  n: number;
  x: number;
  y: number;
  lit: boolean;
}) {
  return (
    <g data-draw-fade="3">
      <rect
        x={x - 10}
        y={y - 10}
        width="20"
        height="20"
        className="transition-[fill] duration-(--dur-fast) ease-out"
        style={{ fill: lit ? "var(--accent)" : "var(--inverse)" }}
      />
      <text
        x={x}
        y={y + 4}
        textAnchor="middle"
        fontSize="11"
        style={{ fill: lit ? "var(--tape-ink)" : "var(--ink-inverse)" }}
      >
        {n}
      </text>
    </g>
  );
}

function Node({ node, active }: { node: DiagramNode; active: boolean }) {
  const cx = node.x + node.w / 2;
  return (
    <g>
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={NODE_H}
        strokeDasharray={node.external ? "4 3" : undefined}
        strokeWidth={active ? 2 : 1}
        data-draw="1"
        data-draw-fill="1"
        className="transition-[fill,stroke-width] duration-(--dur-fast) ease-out"
        style={{
          fill: active ? "var(--sunken)" : "var(--surface)",
          stroke: "var(--diagram)",
        }}
      />
      <text
        x={cx}
        y={node.y + 22}
        textAnchor="middle"
        fontSize="12"
        fill="var(--ink)"
        data-draw-fade="2"
      >
        {node.label.toUpperCase()}
      </text>
      {node.sub && (
        <text
          x={cx}
          y={node.y + 39}
          textAnchor="middle"
          fontSize="10"
          fill="var(--ink-muted)"
          data-draw-fade="2"
        >
          {node.sub}
        </text>
      )}
    </g>
  );
}

/**
 * Mockup B — the exploded view. The system is the figure; every impact line
 * is a numbered callout on the part it describes. Point at either side and
 * the other lights up.
 */
export function Exploded({
  project,
  index,
  figure,
}: {
  project: Project;
  index: number;
  figure: number;
}) {
  const diagram = DIAGRAMS[project.slug];
  const [active, setActive] = useState<number | null>(null);
  if (!diagram) return null;

  const lit = new Set(active === null ? [] : diagram.parts[active]);
  const [w, h] = diagram.viewBox;
  const markerId = `arrow-${project.slug}`;

  return (
    <article
      aria-labelledby={`exploded-${project.slug}`}
      className="grid grid-cols-1 gap-8"
    >
      <Reveal className="grid grid-cols-1 gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <SpecLabel as="p">{entryNo(index)}</SpecLabel>
          <h3
            id={`exploded-${project.slug}`}
            className="mt-2 text-xl font-light"
          >
            {project.title}
          </h3>
          <p className="mt-2 max-w-(--measure) text-lg text-ink-muted">
            {project.summary}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ProjectStatus project={project} />
          <ChipList items={project.kind} variant="solid" label="Kind" />
        </div>
      </Reveal>

      <Reveal>
        <Figure
          number={figure}
          title={diagram.title}
          meta={`${project.highlights.length} callouts`}
          scroll
          note="Draft diagram, drawn from the write-up. Point at a callout below to light the parts it covers."
        >
          <DrawSvg>
            <svg
              viewBox={`0 0 ${w} ${h}`}
              role="img"
              aria-label={`${project.title}: ${diagram.nodes.map((n) => n.label).join(", ")}.`}
              className="mx-auto block w-full max-w-[52rem] min-w-[38rem] font-mono"
            >
              <defs>
                <marker
                  id={markerId}
                  viewBox="0 0 8 8"
                  refX="7"
                  refY="4"
                  markerWidth="8"
                  markerHeight="8"
                  orient="auto"
                >
                  <path d="M0 0 L8 4 L0 8 z" fill="var(--diagram)" />
                </marker>
              </defs>
              {diagram.bands?.map((band, i) => (
                <g key={band.label}>
                  <text
                    x={band.x + 8}
                    y="40"
                    fontSize="10"
                    fill="var(--diagram)"
                    data-draw-fade="0"
                  >
                    {band.label.toUpperCase()}
                  </text>
                  {i > 0 && (
                    <line
                      x1={band.x - 4}
                      y1="24"
                      x2={band.x - 4}
                      y2={h - 16}
                      stroke="var(--diagram)"
                      strokeDasharray="2 4"
                      data-draw="0"
                    />
                  )}
                </g>
              ))}
              {diagram.edges.map((edge) => (
                <path
                  key={edge.d}
                  d={edge.d}
                  fill="none"
                  stroke="var(--diagram)"
                  markerEnd={edge.arrow ? `url(#${markerId})` : undefined}
                  data-draw="2"
                />
              ))}
              {diagram.nodes.map((node) => (
                <Node key={node.id} node={node} active={lit.has(node.id)} />
              ))}
              {diagram.nodes.map(
                (node) =>
                  node.callout && (
                    <Tag
                      key={node.id}
                      n={node.callout}
                      x={node.x}
                      y={node.y}
                      lit={active === node.callout - 1}
                    />
                  ),
              )}
            </svg>
          </DrawSvg>
        </Figure>
      </Reveal>

      <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <ol
          aria-label="Callouts"
          className="grid grid-cols-1 border-t border-strong sm:grid-cols-2 sm:gap-x-8"
        >
          {project.highlights.map((line, i) => (
            <li key={line} className="border-b border-hairline">
              <button
                type="button"
                aria-pressed={active === i}
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="grid w-full grid-cols-[1.75rem_minmax(0,1fr)] gap-3 py-4 text-left text-base outline-offset-2"
              >
                <span
                  data-lit={active === i}
                  className="mt-0.5 grid size-5 place-items-center bg-inverse font-mono text-label leading-none text-ink-inverse transition-colors duration-(--dur-fast) ease-out data-[lit=true]:bg-accent data-[lit=true]:text-(--tape-ink)"
                >
                  {i + 1}
                </span>
                <span>{line}</span>
              </button>
            </li>
          ))}
        </ol>
        <div className="grid content-start gap-8">
          {project.metrics.length > 0 && (
            <SpecTable rows={project.metrics} caption="Table — Ratings" />
          )}
          {project.stack.length > 0 && (
            <div>
              <SpecLabel as="p" className="mb-2">
                Parts
              </SpecLabel>
              <ChipList items={project.stack} label="Stack" />
            </div>
          )}
          <ProjectLinks project={project} />
        </div>
      </div>
    </article>
  );
}
