import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { DocLine, DocLineItem, SectionHeader } from "@/components/manual";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "../_components/theme-switch";
import { getHeroData } from "./_components/hero-data";
import { CoverHero, IntroHero, PlainHero, RangeHero } from "./_components/heroes";

export const metadata: Metadata = {
  title: "Hero Layouts",
  robots: { index: false, follow: false },
};

const MOCKUPS = [
  {
    id: "plain",
    title: "A · Plain",
    meta: "Name first",
    lede: "Name, the one-liner, availability, four text links. The safe default most strong developer portfolios use.",
  },
  {
    id: "intro",
    title: "B · Introduction",
    meta: "Spoken",
    lede: "The name is said inside a sentence: \u201cHi, I\u2019m Ethan.\u201d followed by the one-liner. Warmer and more personal; the name is smaller.",
  },
  {
    id: "range",
    title: "C · Kernel to interface",
    meta: "Typographic",
    lede: "The one-liner is the headline, and the range shows in the type: \u201ckernel\u201d is set in mono, the rest in the display sans. One quiet idea, no extra parts.",
  },
  {
    id: "cover",
    title: "D · Cover",
    meta: "Poster",
    lede: "The manual\u2019s cover as a poster: the name as large as the page allows, one ink rule, then the sentence and the links on a single line.",
  },
] as const;

function Mockup({
  index,
  id,
  title,
  meta,
  lede,
  name,
  children,
}: {
  name: string;
  index: number;
  id: string;
  title: string;
  meta: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-8 grid-cols-1 gap-6">
      <SectionHeader index={index} id={`${id}-h`} title={title} meta={meta} />
      <p className="max-w-(--measure) text-base text-ink-muted">{lede}</p>
      {/* The first viewport, framed: what / would open on, under its running head. */}
      <div className="border border-hairline bg-bg px-(--gutter)">
        <DocLine>
          <DocLineItem emphasis>{name}</DocLineItem>
          <DocLineItem>Operator&apos;s manual</DocLineItem>
          <DocLineItem>p. 01</DocLineItem>
        </DocLine>
        {children}
      </div>
    </section>
  );
}

export default function HeroLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const data = getHeroData();
  const heroes = [PlainHero, IntroHero, RangeHero, CoverHero];

  return (
    <div className="mx-auto w-full max-w-(--container) px-(--gutter) pb-24">
      <DocLine>
        <DocLineItem emphasis>{data.name}</DocLineItem>
        <DocLineItem>Hero layouts</DocLineItem>
        <DocLineItem>p. 00h</DocLineItem>
      </DocLine>

      <header className="grid gap-8 pt-12 pb-16 sm:pt-20">
        <div className="max-w-(--measure)">
          <h1 className="text-display font-light">Hero layouts</h1>
          <p className="mt-4 text-lg text-ink-muted">
            Four ways to open the manual. Each one is only the name, the
            one-liner, availability and four links; everything else lives in
            the chapters below. What changes is how you&apos;re introduced.
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
        {MOCKUPS.map((m, i) => {
          const Hero = heroes[i];
          return (
            <Mockup key={m.id} index={i + 1} name={data.name} {...m}>
              <Hero data={data} as="h2" />
            </Mockup>
          );
        })}
        <p className="text-sm text-ink-muted">
          Resume points at /resume.pdf until a public-safe PDF is in /public and
          links.resume is set.
        </p>
      </div>
    </div>
  );
}
