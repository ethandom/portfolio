import { SectionHeader } from "@/components/manual";
import { Reveal, ScrambleText } from "@/components/motion";
import { getFeaturedProjects } from "@/lib/content";
import { entryNo } from "./project-links";
import { Spread } from "./spread";
import { SpreadBook } from "./spread-book";

const TITLE = "Projects";

/**
 * The Projects chapter: every featured project as a spread in one book.
 * The server prints the spreads stacked; SpreadBook binds them on wide screens.
 * The page sets the chapter number, so chapters can be reordered there.
 */
export function Projects({ chapter }: { chapter: number }) {
  const projects = getFeaturedProjects();

  return (
    <section
      id="projects"
      aria-labelledby="projects-h"
      className="grid scroll-mt-8 grid-cols-1"
    >
      <SpreadBook
        chapter={chapter}
        title={TITLE}
        header={
          <Reveal variant="rules">
            <SectionHeader
              index={chapter}
              id="projects-h"
              title={<ScrambleText text={TITLE} />}
              meta={`${projects.length} entries`}
            />
          </Reveal>
        }
        entries={projects.map((p, i) => ({
          slug: p.slug,
          no: entryNo(chapter, i),
          title: p.title,
        }))}
      >
        {projects.map((p, i) => (
          <Spread key={p.slug} project={p} chapter={chapter} index={i} />
        ))}
      </SpreadBook>
    </section>
  );
}
