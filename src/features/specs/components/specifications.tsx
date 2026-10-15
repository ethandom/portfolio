import type { ReactNode } from "react";
import { SectionHeader, StackMark } from "@/components/manual";
import { Reveal, ScrambleText } from "@/components/motion";
import { formatYearMonth, getProfile } from "@/lib/content";

const SKILL_GROUPS = [
  ["languages", "Languages"],
  ["frameworks", "Frameworks"],
  ["tools", "Tools"],
  ["libraries", "Libraries"],
] as const;

/** A datasheet row: mono parameter on the left, the value beside it from `sm`. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-2 border-b border-hairline py-5 last:border-strong sm:grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="font-mono text-label text-ink-muted uppercase sm:pt-2">
        {label}
      </dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

/** Table caption: what the block below is, over its ink rule. */
function Caption({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3
      id={id}
      className="border-b border-strong pb-2 font-mono text-label text-ink uppercase"
    >
      {children}
    </h3>
  );
}

/**
 * Specifications: the education record and the skills datasheet.
 * Measured results stay with the work they came from, in the chapters below.
 */
export function Specifications({ chapter }: { chapter: number }) {
  const { education, skills } = getProfile();

  return (
    <section
      id="specifications"
      aria-labelledby="specifications-h"
      className="grid scroll-mt-8 grid-cols-1 gap-8"
    >
      <Reveal variant="rules">
        <SectionHeader
          index={chapter}
          id="specifications-h"
          title={<ScrambleText text="Specifications" />}
        />
      </Reveal>

      <section aria-labelledby="education-h">
        <Caption id="education-h">Education</Caption>
        <div className="grid grid-cols-1 gap-x-16 gap-y-6 border-b border-strong py-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-1">
            <p className="text-xl font-light">{education.school}</p>
            <p className="text-base text-ink">
              {education.degree}
              {education.minor && `, minor in ${education.minor}`}
            </p>
            <p className="mt-3 flex items-baseline gap-3">
              <span className="font-mono text-label text-ink-muted uppercase">
                Graduates
              </span>
              <span className="font-mono text-base tabular-nums">
                {formatYearMonth(education.graduation)}
              </span>
            </p>
          </div>
          {education.coursework.length > 0 && (
            <div className="grid content-start gap-3">
              <h4 className="font-mono text-label text-ink-muted uppercase">
                Coursework
              </h4>
              <ul className="grid gap-x-6 gap-y-1.5 text-sm text-ink sm:grid-cols-2">
                {education.coursework.map((course) => (
                  <li key={course}>{course}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="skills-h">
        <Caption id="skills-h">Skills</Caption>
        <dl>
          {SKILL_GROUPS.map(([key, label]) => (
            <Row key={key} label={label}>
              <ul
                aria-label={label}
                className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 lg:grid-cols-5"
              >
                {skills[key].map((skill) => (
                  <li key={skill} className="flex min-w-0 items-center gap-2.5">
                    <StackMark name={skill} className="size-7 [&_svg]:size-4" />
                    <span className="truncate text-sm text-ink">{skill}</span>
                  </li>
                ))}
              </ul>
            </Row>
          ))}
        </dl>
      </section>
    </section>
  );
}
