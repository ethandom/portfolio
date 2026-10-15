import { SectionHeader } from "@/components/manual";
import { Reveal, ScrambleText } from "@/components/motion";
import { getExperience, getProject } from "@/lib/content";
import { Featured } from "./featured";
import { ServiceLog } from "./service-log";

/**
 * The Work History chapter: the current role printed open, then the
 * past roles as a service log. The page sets the chapter number.
 */
export function WorkHistory({ chapter }: { chapter: number }) {
  const [current, ...past] = getExperience();
  const project = current.project ? getProject(current.project) : undefined;

  return (
    <section
      id="work-history"
      aria-labelledby="work-history-h"
      className="grid scroll-mt-8 grid-cols-1 gap-8"
    >
      <Reveal variant="rules">
        <SectionHeader
          index={chapter}
          id="work-history-h"
          title={<ScrambleText text="Work History" />}
          meta={`${past.length + 1} entries`}
        />
      </Reveal>
      <Featured entry={current} project={project} />
      <ServiceLog entries={past} firstFigure={1} />
    </section>
  );
}
