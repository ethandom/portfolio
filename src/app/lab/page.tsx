import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import {
  ChipList,
  DocLine,
  DocLineItem,
  Figure,
  Led,
  SectionHeader,
  SpecLabel,
  SpecTable,
  StatusChip,
  TapeStripe,
  projectStatusLed,
} from "@/components/manual";
import { Button } from "@/components/ui/button";
import { formatPeriod, getProfile, getProjects } from "@/lib/content";
import { ControlsDemo } from "./_components/controls-demo";
import { ThemeSwitch } from "./_components/theme-switch";

export const metadata: Metadata = {
  title: "Component Lab",
  robots: { index: false, follow: false },
};

const SWATCHES = [
  ["bg", "Paper"],
  ["surface", "Surface"],
  ["sunken", "Sunken"],
  ["inverse", "Inverse"],
  ["ink", "Ink"],
  ["ink-muted", "Ink muted"],
  ["hairline", "Hairline"],
  ["rule", "Rule"],
  ["accent", "Accent · decoration"],
  ["accent-text", "Accent text"],
  ["live", "Live"],
  ["diagram", "Diagram"],
  ["highlight", "Highlight"],
  ["error", "Error"],
] as const;

const TYPE_SCALE = [
  ["display", "text-display font-light", "Ethan Austin-Cruse"],
  ["xl", "text-xl font-light", "From the kernel to the interface"],
  ["lg", "text-lg", "A crash-safe export worker with atomic job claiming."],
  ["base", "text-base", "Lease-based retry means a crashed worker's job is picked up again."],
  ["sm", "text-sm text-ink-muted", "Covered by 200+ Deno tests."],
  ["label", "font-mono text-label uppercase", "Contacts per transfer"],
] as const;

const RAMP = [0, 25, 50, 75, 100];

/** Deterministic sample so the specimen doesn't change between renders. */
function sampleLevel(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  const r = x - Math.floor(x);
  return r < 0.35 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : r < 0.93 ? 3 : 4;
}

function Section({
  index,
  title,
  meta,
  children,
}: {
  index: number;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  const id = `lab-${index}`;
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-8">
      <SectionHeader index={index} title={title} meta={meta} id={id} />
      {children}
    </section>
  );
}

export default function LabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const profile = getProfile();
  const projects = getProjects();
  const byte = [1, 0, 1, 1, 0, 0, 1, 0];

  return (
    <>
      <div className="mx-auto w-full max-w-(--container) px-(--gutter)">
        <DocLine>
          <DocLineItem emphasis>{profile.name}</DocLineItem>
          <DocLineItem>Component lab</DocLineItem>
          <DocLineItem className="hidden sm:flex">Rev. 2026.10</DocLineItem>
          <DocLineItem>p. 00</DocLineItem>
        </DocLine>

        <header className="flex flex-wrap items-end justify-between gap-6 pt-12 pb-16 sm:pt-20">
          <div className="max-w-(--measure)">
            <h1 className="text-display font-light">Component lab</h1>
            <p className="mt-4 text-lg text-ink-muted">
              Every piece of the Shop Manual system, set with real content. This page
              exists only in development.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ThemeSwitch />
            <Button variant="link" asChild>
              <Link href="/lab/activity">
                Activity lab
                <ArrowUpRightIcon weight="light" />
              </Link>
            </Button>
            <Button variant="link" asChild>
              <Link href="/lab/hero">
                Hero lab
                <ArrowUpRightIcon weight="light" />
              </Link>
            </Button>
            <Button variant="link" asChild>
              <Link href="/lab/motion">
                Motion lab
                <ArrowUpRightIcon weight="light" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-(--section-gap) pb-(--section-gap)">
          <Section index={1} title="Color" meta={`${SWATCHES.length} tokens`}>
            <ul className="grid grid-cols-2 border-t border-l border-hairline sm:grid-cols-4 lg:grid-cols-7">
              {SWATCHES.map(([token, name]) => (
                <li key={token} className="border-r border-b border-hairline">
                  <div
                    className="h-16 border-b border-hairline"
                    style={{ background: `var(--${token})` }}
                  />
                  <div className="grid gap-0.5 px-2 py-2">
                    <span className="text-sm">{name}</span>
                    <SpecLabel>--{token}</SpecLabel>
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section index={2} title="Type" meta="Inter · IBM Plex Mono">
            <dl className="border-t border-hairline">
              {TYPE_SCALE.map(([name, cls, sample]) => (
                <div
                  key={name}
                  className="grid gap-2 border-b border-hairline py-4 sm:grid-cols-[10rem_1fr] sm:items-baseline"
                >
                  <dt>
                    <SpecLabel>text-{name}</SpecLabel>
                  </dt>
                  <dd className={cls}>{sample}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section index={3} title="Labels & status">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="grid content-start gap-3">
                <SpecLabel tone="ink" weight="medium">Spec label · tones</SpecLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <SpecLabel>Muted</SpecLabel>
                  <SpecLabel tone="ink">Ink</SpecLabel>
                  <SpecLabel tone="accent">Accent</SpecLabel>
                  <SpecLabel tone="inverse">Inverse plate</SpecLabel>
                </div>
              </div>
              <div className="grid content-start gap-3">
                <SpecLabel tone="ink" weight="medium">Status chip</SpecLabel>
                <div className="flex flex-wrap gap-2">
                  <StatusChip state={profile.status.available ? "live" : "off"}>
                    {profile.status.label}
                  </StatusChip>
                  {projects.map((p) => (
                    <StatusChip key={p.slug} state={projectStatusLed[p.status]}>
                      {p.title} · {p.status}
                    </StatusChip>
                  ))}
                </div>
              </div>
            </div>
          </Section>

          <Section index={4} title="Chips" meta={`${projects.length} projects`}>
            <ul className="border-t border-hairline">
              {projects.map((p) => (
                <li
                  key={p.slug}
                  className="grid gap-3 border-b border-hairline py-4 sm:grid-cols-[10rem_1fr]"
                >
                  <div className="grid gap-0.5">
                    <span className="text-base">{p.title}</span>
                    <SpecLabel>{formatPeriod(p.period)}</SpecLabel>
                  </div>
                  <div className="grid gap-2">
                    <ChipList items={p.kind} variant="solid" label="Kind" />
                    {p.stack.length > 0 ? (
                      <ChipList items={p.stack} label="Stack" />
                    ) : (
                      <span className="text-sm text-ink-muted">No stack listed yet.</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Section>

          <Section index={5} title="Specifications" meta={`${profile.metrics.length} parameters`}>
            <SpecTable rows={profile.metrics} caption="Table 1 — Key figures" />
          </Section>

          <Section index={6} title="Figures">
            <Figure
              number={1}
              title="Relay byte"
              meta="1 bit = 1 relay"
              scroll
              note="One byte written to the device sets every relay on the board at once: 0xB2 closes K7, K5, K4 and K1."
            >
              <svg
                viewBox="0 0 560 196"
                role="img"
                aria-label="The byte 0xB2 fans out to eight relays; bits 7, 5, 4 and 1 are closed."
                className="mx-auto block w-full max-w-[560px] min-w-[30rem] font-mono"
              >
                <rect x="170" y="6" width="220" height="36" fill="var(--surface)" stroke="var(--diagram)" />
                <text x="280" y="29" textAnchor="middle" fontSize="13" fill="var(--ink)">
                  write(fd, 0xB2)
                </text>
                <line x1="280" y1="42" x2="280" y2="70" stroke="var(--diagram)" />
                <line x1="56" y1="70" x2="504" y2="70" stroke="var(--diagram)" />
                {byte.map((bit, i) => {
                  const cx = 56 + i * 64;
                  return (
                    <g key={i}>
                      <line x1={cx} y1="70" x2={cx} y2="98" stroke="var(--diagram)" />
                      <rect
                        x={cx - 22}
                        y="98"
                        width="44"
                        height="44"
                        fill={bit ? "var(--accent)" : "var(--surface)"}
                        stroke={bit ? "var(--accent)" : "var(--diagram)"}
                      />
                      <text
                        x={cx}
                        y="125"
                        textAnchor="middle"
                        fontSize="14"
                        fill={bit ? "var(--graphite-900)" : "var(--ink-muted)"}
                      >
                        {bit}
                      </text>
                      <text x={cx} y="166" textAnchor="middle" fontSize="11" fill="var(--ink-muted)">
                        K{7 - i}
                      </text>
                      <text x={cx} y="184" textAnchor="middle" fontSize="10" fill="var(--diagram)">
                        B{7 - i}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </Figure>

            <Figure
              number={2}
              title="Activity ramp"
              scroll
              grid={false}
              meta={
                <span className="flex items-center gap-1.5">
                  Less
                  {RAMP.map((n) => (
                    <span
                      key={n}
                      aria-hidden
                      className="size-2.5"
                      style={{ background: `color-mix(in oklab, var(--accent) ${n}%, var(--sunken))` }}
                    />
                  ))}
                  More
                </span>
              }
              note="Sample data. The real calendar comes from GitHub and LeetCode in step 4; on phones it scrolls inside this frame."
            >
              <svg
                viewBox={`0 0 ${53 * 12} ${7 * 12}`}
                role="img"
                aria-label="Sample activity heatmap, 53 weeks by 7 days"
                className="block w-[636px] max-w-none"
              >
                {Array.from({ length: 53 * 7 }, (_, i) => {
                  const week = Math.floor(i / 7);
                  const day = i % 7;
                  return (
                    <rect
                      key={i}
                      x={week * 12}
                      y={day * 12}
                      width="10"
                      height="10"
                      fill={`color-mix(in oklab, var(--accent) ${RAMP[sampleLevel(i)]}%, var(--sunken))`}
                    />
                  );
                })}
              </svg>
            </Figure>
          </Section>

          <Section index={7} title="Controls">
            <ControlsDemo github={profile.links.github} email={profile.links.email} />
          </Section>
        </main>
      </div>

      <TapeStripe label="End of manual" />
      <footer data-theme="dark" className="bg-bg text-ink">
        <div className="mx-auto grid w-full max-w-(--container) gap-8 px-(--gutter) py-12 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <SpecLabel>Night shift · footer specimen</SpecLabel>
            <p className="max-w-(--measure) text-lg font-light">{profile.oneLiner}</p>
          </div>
          <div className="flex items-center gap-2 self-end">
            <Led state="live" />
            <SpecLabel tone="ink">{profile.location}</SpecLabel>
          </div>
        </div>
      </footer>
    </>
  );
}
