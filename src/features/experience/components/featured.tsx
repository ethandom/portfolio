import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { SpecLabel, StatusChip } from "@/components/manual";
import { Button } from "@/components/ui/button";
import type { Experience, Project } from "@/lib/content";
import { cn } from "@/lib/cn";
import { DemoVideo } from "./demo-video";
import { CorePoints, PeriodLine, Tools } from "./shared";

/**
 * The current role, printed open and read top to bottom: who and what, the
 * product running full width, then what it did and what it's built with.
 * The order holds at every width, so a phone gets the same page in one column.
 */
export function Featured({
  entry,
  project,
  className,
}: {
  entry: Experience;
  project?: Project;
  className?: string;
}) {
  return (
    <article
      aria-labelledby={`featured-${entry.slug}`}
      className={cn("grid grid-cols-1 border border-strong bg-surface", className)}
    >
      <header className="grid grid-cols-1 gap-5 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-x-12">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <StatusChip state="live">Current</StatusChip>
            <PeriodLine entry={entry} />
          </div>
          <div>
            <h3 id={`featured-${entry.slug}`} className="text-xl font-medium">
              {entry.org}
            </h3>
            <SpecLabel as="p" tone="ink" className="mt-1">
              {entry.role}
            </SpecLabel>
          </div>
          {project && (
            <p className="max-w-(--measure) text-lg text-ink-muted">
              {project.summary}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {project?.links.live && (
            <Button variant="link" asChild>
              <a href={project.links.live} target="_blank" rel="noreferrer">
                {new URL(project.links.live).host}
                <ArrowUpRightIcon weight="light" />
              </a>
            </Button>
          )}
        </div>
      </header>
      {entry.demo && (
        <div className="px-3 sm:px-8">
          <DemoVideo src={entry.demo} label={`${entry.org} product demo`} />
        </div>
      )}
      <CorePoints
        entry={entry}
        className="gap-x-12 gap-y-4 p-5 sm:p-8 md:grid-cols-2"
      />
      <Tools
        entry={entry}
        className="gap-x-4 border-t border-hairline px-5 py-5 sm:px-8 lg:flex-nowrap lg:justify-between"
      />
    </article>
  );
}
