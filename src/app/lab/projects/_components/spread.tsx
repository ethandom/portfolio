import { SpecLabel, SpecTable } from "@/components/manual";
import { formatPeriod, type Project } from "@/lib/content";
import { cn } from "@/lib/cn";
import { RelayRig } from "./relay-rig";
import { ProjectLinks, entryNo } from "./shared";
import { SongVector } from "./song-vector";
import { StackMark } from "./stack-marks";

/** Running head and folio of one page of the spread. */
function Page({
  head,
  folio,
  side,
  children,
}: {
  head: [string, string];
  folio: number;
  side: "verso" | "recto";
  children: React.ReactNode;
}) {
  return (
    <div data-page={side} className="relative flex min-w-0 flex-col bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-2 font-mono text-label text-ink-muted uppercase sm:px-8">
        <span>{head[0]}</span>
        <span>{head[1]}</span>
      </div>
      <div className="flex flex-1 flex-col px-5 py-5 sm:px-8">{children}</div>
      <div
        className={cn(
          "px-5 pb-3 font-mono text-label text-ink-muted uppercase sm:px-8",
          side === "recto" && "text-right",
        )}
      >
        p. {String(folio).padStart(2, "0")}
      </div>
      {/* Ink tint while the page is lifted; SpreadBook sets its opacity. */}
      <span
        aria-hidden
        data-shade
        className="pointer-events-none absolute inset-0 bg-inverse opacity-0"
      />
    </div>
  );
}

/** The skim layer shows the top lines; the full list lives in /content and the machine files. */
const IMPACT_LINES = 3;

/**
 * Mockup-only: a working figure for the projects that have one.
 * If this ships, which figure a project gets moves into /content.
 */
const FIGURES: Partial<
  Record<string, (props: { figure: string }) => React.ReactNode>
> = {
  "usb-relay-driver": RelayRig,
};

/** Mockup-only: a still figure that takes the ratings table's place on the recto. */
const PLATES: Partial<
  Record<string, (props: { figure: string }) => React.ReactNode>
> = {
  tempr: SongVector,
};

/**
 * Mockup A — one project as an open manual.
 * Verso: the record (name, impact, what it's built with, where to go next).
 * Recto: the thing itself, running; or its ratings when it has no figure.
 */
export function Spread({
  project,
  index,
}: {
  project: Project;
  index: number;
}) {
  const folio = 4 + index * 2;
  const Fig = FIGURES[project.slug];
  const Plate = PLATES[project.slug];

  return (
    <article
      id={`spread-entry-${project.slug}`}
      data-spread
      aria-labelledby={`spread-${project.slug}`}
      className="grid grid-cols-1 border border-strong bg-surface lg:grid-cols-[minmax(0,1fr)_1rem_minmax(0,1fr)]"
    >
      <Page
        head={[entryNo(index), formatPeriod(project.period)]}
        folio={folio}
        side="verso"
      >
        <h3
          id={`spread-${project.slug}`}
          className="text-[clamp(1.75rem,1.3rem+1.6vw,2.5rem)] leading-[1.1] font-light tracking-[-0.02em] text-balance"
        >
          {project.title}
        </h3>
        <p className="mt-3 max-w-(--measure) text-base text-ink-muted">
          {project.summary}
        </p>

        <h4 className="sr-only">Impact</h4>
        <ol className="mt-6 border-t border-strong">
          {project.highlights.slice(0, IMPACT_LINES).map((line, i) => (
            <li
              key={line}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-2 border-b border-hairline py-2 text-base"
            >
              <span className="pt-1 font-mono text-label text-accent-text">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="max-w-(--measure)">{line}</span>
            </li>
          ))}
        </ol>

        <SpecLabel as="h4" tone="ink" className="mt-6">
          Built with
        </SpecLabel>
        <ul
          aria-label="Stack"
          className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-3"
        >
          {project.stack.map((name) => (
            <li key={name} className="flex min-w-0 items-center gap-2.5">
              <StackMark name={name} className="size-7 [&_svg]:size-4" />
              <span className="truncate text-sm">{name}</span>
            </li>
          ))}
        </ul>

        <ProjectLinks project={project} className="mt-auto pt-6" />
      </Page>

      {/* The binding: a sunken gutter between two hairlines. */}
      <div
        aria-hidden
        data-binding
        className="h-4 border-y border-hairline bg-sunken lg:h-auto lg:border-y-0 lg:border-x"
      />

      <Page
        head={[
          Fig ? "Operation" : Plate ? "Principle" : "Ratings",
          project.title,
        ]}
        folio={folio + 1}
        side="recto"
      >
        {Fig ? (
          <Fig figure={entryNo(index)} />
        ) : Plate ? (
          <Plate figure={entryNo(index)} />
        ) : (
          project.metrics.length > 0 && (
            <SpecTable caption="Table — Ratings" rows={project.metrics} />
          )
        )}
      </Page>
    </article>
  );
}
