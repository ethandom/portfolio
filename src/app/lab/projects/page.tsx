import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { DocLine, DocLineItem, SectionHeader } from "@/components/manual";
import { Reveal, ScrambleText } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Projects } from "@/features/projects";
import { getProfile, getProject } from "@/lib/content";
import { ThemeSwitch } from "../_components/theme-switch";
import { Datasheet } from "./_components/datasheet";
import { Exploded } from "./_components/exploded";

export const metadata: Metadata = {
  title: "Project Layouts",
  robots: { index: false, follow: false },
};

/** Two projects with different shapes: a web product and a kernel driver. */
const SAMPLES = ["conturo", "usb-relay-driver"] as const;

const MOCKUPS = [
  {
    id: "spread",
    title: "A · Spread",
    meta: "On /",
    lede: "An open manual, pinned while you read it. The left page is the record: name, impact, the tools it was built with, then the live site or repo. The right page is the project itself, running, where there is one (the relay driver drives a live board from a relayctl prompt), or else its ratings. Scrolling turns the page to the next project. On phones, with reduced motion, or when a spread is taller than the screen, the spreads stack instead.",
  },
  {
    id: "exploded",
    title: "B · Exploded view",
    meta: "Reference",
    lede: "A service-manual parts diagram. The system is the figure, and every impact line is a numbered callout on the part it describes. Point at a callout and its parts light up. Strongest for engineers; needs a drawn diagram per project.",
  },
  {
    id: "datasheet",
    title: "C · Datasheet",
    meta: "Reference",
    lede: "Each project is a component with its own front page: features and applications on the left, the stack drawn as the chip's pinout and the metrics as absolute ratings on the right.",
  },
] as const;

function Chapter({
  index,
  id,
  title,
  meta,
  lede,
  children,
}: {
  index: number;
  id: string;
  title: string;
  meta: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="grid scroll-mt-8 grid-cols-1 gap-8"
    >
      <Reveal variant="rules">
        <SectionHeader
          index={index}
          id={`${id}-h`}
          title={<ScrambleText text={title} />}
          meta={meta}
        />
      </Reveal>
      <p className="max-w-(--measure) text-base text-ink-muted">{lede}</p>
      <div className="grid grid-cols-1 gap-16">{children}</div>
    </section>
  );
}

export default function ProjectsLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const profile = getProfile();
  const projects = SAMPLES.map((slug) => getProject(slug)).filter(
    (p) => p !== undefined,
  );

  return (
    <div className="mx-auto w-full max-w-(--container) px-(--gutter) pb-24">
      <DocLine data-power-on>
        <DocLineItem emphasis>{profile.name}</DocLineItem>
        <DocLineItem>
          <ScrambleText trigger="mount" text="Project layouts" />
        </DocLineItem>
        <DocLineItem>
          <ScrambleText trigger="mount" text="p. 00c" />
        </DocLineItem>
      </DocLine>

      <header className="grid gap-8 pt-12 pb-16 sm:pt-20">
        <div className="max-w-(--measure)">
          <h1 className="text-display font-light">Project layouts</h1>
          <p className="mt-4 text-lg text-ink-muted">
            Three ways to print chapter 03, Projects. A, the spread, is the
            pick; B and C stay here for reference. Work experience is a separate
            chapter, 02 Work History, and never appears in these components.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <nav aria-label="Mockups" className="flex flex-wrap gap-2">
            {MOCKUPS.map((m) => (
              <Button key={m.id} variant="outline" asChild>
                <a href={`#${m.id}`}>{m.title}</a>
              </Button>
            ))}
          </nav>
          <div className="flex flex-wrap items-center gap-4">
            <ThemeSwitch />
            <Button variant="link" asChild>
              <Link href="/lab">
                Component lab
                <ArrowUpRightIcon weight="light" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-(--section-gap)">
        <Chapter index={1} {...MOCKUPS[0]}>
          {/* The shipped chapter, exactly as it sits on the Manual page. */}
          <Projects chapter={3} />
        </Chapter>
        <Chapter index={2} {...MOCKUPS[1]}>
          {projects.map((p, i) => (
            <Exploded key={p.slug} project={p} index={i} figure={i + 1} />
          ))}
        </Chapter>
        <Chapter index={3} {...MOCKUPS[2]}>
          {projects.map((p, i) => (
            <Datasheet key={p.slug} project={p} figure={i + 3} />
          ))}
        </Chapter>
        <p className="text-sm text-ink-muted">
          Tool marks via Simple Icons; trademarks belong to their owners.
        </p>
      </div>
    </div>
  );
}
