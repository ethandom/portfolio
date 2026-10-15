import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { DocLine, DocLineItem, SectionHeader, StatusChip } from "@/components/manual";
import { Reveal, ScrambleText } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { DemoVideo, EntryFigure, WorkHistory } from "@/features/experience";
import { getExperience, getProfile } from "@/lib/content";
import { ThemeSwitch } from "../_components/theme-switch";
import { Rail } from "./_components/rail";
import { RailCard } from "./_components/rail-card";

export const metadata: Metadata = {
  title: "Work History Layouts",
  robots: { index: false, follow: false },
};

const MOCKUPS = [
  {
    id: "featured",
    title: "A · Featured + log",
    meta: "On /",
    lede: "The current role is printed open and reads top to bottom: who and what, the product running full width, then the core points and tools. Past roles sit underneath as a service log: the core points always show, numbers marked, and each figure folds out on demand. The page scrolls normally, and it reads the same on a phone.",
  },
  {
    id: "rail",
    title: "B · Rail",
    meta: "Reference",
    lede: "Every role is a card on one sideways track, newest first. The current role is the wide lead car with the demo; past roles follow, each with its figure already open. The track scrolls inside its own frame (swipe, arrow keys, or the segment bar), so the page never scrolls sideways.",
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
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-8 grid-cols-1 gap-8">
      <Reveal variant="rules">
        <SectionHeader index={index} id={`${id}-h`} title={<ScrambleText text={title} />} meta={meta} />
      </Reveal>
      <p className="max-w-(--measure) text-base text-ink-muted">{lede}</p>
      <div className="grid grid-cols-1 gap-8">{children}</div>
    </section>
  );
}

export default function ExperienceLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const profile = getProfile();
  const [current, ...past] = getExperience();

  return (
    <div className="mx-auto w-full max-w-(--container) px-(--gutter) pb-24">
      <DocLine data-power-on>
        <DocLineItem emphasis>{profile.name}</DocLineItem>
        <DocLineItem>
          <ScrambleText trigger="mount" text="Work history layouts" />
        </DocLineItem>
        <DocLineItem>
          <ScrambleText trigger="mount" text="p. 00d" />
        </DocLineItem>
      </DocLine>

      <header className="grid gap-8 pt-12 pb-16 sm:pt-20">
        <div className="max-w-(--measure)">
          <h1 className="text-display font-light">Work history layouts</h1>
          <p className="mt-4 text-lg text-ink-muted">
            Two ways to print chapter 02. Conturo is the current role and leads
            with the product itself. Each past role gets a figure that shows
            the work instead of describing it.
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
              <Link href="/lab/projects">
                Project layouts
                <ArrowUpRightIcon weight="light" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-(--section-gap)">
        <Chapter index={1} {...MOCKUPS[0]}>
          {/* The shipped chapter, exactly as it sits on the Manual page. */}
          <WorkHistory chapter={2} />
        </Chapter>

        <Chapter index={2} {...MOCKUPS[1]}>
          <SectionHeader index={2} title="Work History" meta={`${past.length + 1} entries`} />
          <Rail labels={[current, ...past].map((e) => e.org)}>
            <RailCard
              entry={current}
              index={0}
              wide
              status={<StatusChip state="live">Current</StatusChip>}
            >
              {current.demo && (
                <DemoVideo src={current.demo} label={`${current.org} product demo`} />
              )}
            </RailCard>
            {past.map((entry, i) => (
              <RailCard key={entry.slug} entry={entry} index={i + 1}>
                <EntryFigure entry={entry} number={10 + i} />
              </RailCard>
            ))}
          </Rail>
        </Chapter>
      </div>
    </div>
  );
}
