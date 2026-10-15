import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import {
  DocLine,
  DocLineItem,
  Figure,
  SectionHeader,
  SpecLabel,
  SpecTable,
  StatusChip,
  TapeStripe,
  type SpecRow,
} from "@/components/manual";
import { CountUp, DrawSvg, Reveal, ScrambleText } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { formatPeriod, getExperience, getProfile } from "@/lib/content";
import { stagger } from "@/lib/motion/presets";
import { ThemeSwitch } from "../_components/theme-switch";
import { ActivityScan } from "./_components/activity-scan";
import { EasingTracks } from "./_components/easing-tracks";
import { MotionControls } from "./_components/motion-controls";
import { OverlaysDemo } from "./_components/overlays-demo";
import { RelayByte } from "./_components/relay-byte";
import { Replay } from "./_components/replay";

export const metadata: Metadata = {
  title: "Motion Lab",
  robots: { index: false, follow: false },
};

const DURATIONS: SpecRow[] = [
  { label: "Instant", value: "80 ms", note: "--dur-instant · key press, tooltip exit. Kept under reduced motion." },
  { label: "Fast", value: "160 ms", note: "--dur-fast · hover and color, tooltip entrance, dialog exit." },
  { label: "Base", value: "240 ms", note: "--dur-base · dialog entrance, switch lamps, heatmap cells." },
  { label: "Slow", value: "480 ms", note: "--dur-slow · rules drawing, blocks printing, figure strokes." },
];

const REDUCED: SpecRow[] = [
  { label: "Chapter rule draws", value: "480 ms", note: "Already drawn" },
  { label: "Block prints in", value: "480 ms", note: "Already printed; never hidden" },
  { label: "Readout scramble", value: "240–720 ms", note: "Final text only" },
  { label: "Count-up", value: "720 ms", note: "Final value only" },
  { label: "Figure plots in", value: "480 ms + 90 ms/step", note: "Finished diagram" },
  { label: "Lamp warm-up", value: "240–480 ms", note: "Lit" },
  { label: "Tooltip tag", value: "160 ms", note: "Appears at once; 80 ms fade out" },
  { label: "Dialog sheet", value: "240 / 160 ms", note: "80 ms cross-fade, no travel" },
  { label: "Heatmap scan", value: "240 ms + 4 ms/week", note: "Cells change together, at once" },
  { label: "Key press", value: "1 px", note: "Kept: it confirms the action" },
];

/** Power-on traces: [label, start ms, end ms]; null start = on from first paint. */
const TRACES: [string, number | null, number][] = [
  ["Name, one-liner", null, 1000],
  ["Running-head rule", 0, 480],
  ["Head readouts", 0, 380],
  ["Status lamp", 360, 840],
];

function Chapter({
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
  const id = `motion-${index}`;
  return (
    <section aria-labelledby={id} className="grid grid-cols-1 gap-8">
      <Reveal variant="rules">
        <SectionHeader index={index} title={<ScrambleText text={title} />} meta={meta} id={id} />
      </Reveal>
      {children}
    </section>
  );
}

function Lede({ children }: { children: ReactNode }) {
  return <p className="max-w-(--measure) text-base text-ink-muted">{children}</p>;
}

function PowerOnTiming() {
  const x = (ms: number) => 168 + ms * 0.44;
  const row = (i: number) => 28 + i * 34;
  return (
    <DrawSvg step={110}>
      <svg
        viewBox="0 0 640 196"
        role="img"
        aria-label="Power-on timing: the name and one-liner are on from first paint; the running-head rule draws from 0 to 480ms, the head readouts settle by 380ms, and the status lamp warms up from 360 to 840ms."
        className="block w-full min-w-[34rem] font-mono"
      >
        {[0, 200, 400, 600, 800, 1000].map((ms) => (
          <g key={ms}>
            <line x1={x(ms)} y1="14" x2={x(ms)} y2="160" stroke="var(--hairline)" strokeDasharray="2 3" />
            <text x={x(ms)} y="180" textAnchor="middle" fontSize="10" fill="var(--ink-muted)" data-draw-fade="0">
              {ms}
            </text>
          </g>
        ))}
        <text x="632" y="180" textAnchor="end" fontSize="10" fill="var(--ink-muted)" data-draw-fade="0">
          MS
        </text>
        {TRACES.map(([label, start, end], i) => {
          const low = row(i) + 10;
          const high = row(i) - 6;
          const d =
            start === null
              ? `M${x(0)} ${high} H${x(end)}`
              : `M${x(0)} ${low} H${x(start)} V${high} H${x(end)} V${low} H${x(1000)}`;
          return (
            <g key={label}>
              <text x="0" y={low} fontSize="11" fill="var(--ink-muted)" data-draw-fade={i}>
                {label.toUpperCase()}
              </text>
              <path d={d} fill="none" stroke="var(--diagram)" strokeWidth="1.5" data-draw={i} />
            </g>
          );
        })}
      </svg>
    </DrawSvg>
  );
}

export default function MotionLabPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const profile = getProfile();
  const experience = getExperience();
  const [firstParagraph] = profile.bio.split("\n\n");

  return (
    <>
      <div className="mx-auto w-full max-w-(--container) px-(--gutter)">
        {/* Only the running head powers on; chapter rules below draw on scroll. */}
        <DocLine data-power-on>
          <DocLineItem emphasis>{profile.name}</DocLineItem>
          <DocLineItem>
            <ScrambleText trigger="mount" text="Motion lab" />
          </DocLineItem>
          <DocLineItem className="hidden sm:flex">
            <ScrambleText trigger="mount" text="Rev. 2026.10" />
          </DocLineItem>
          <DocLineItem>
            <ScrambleText trigger="mount" text="p. 00b" />
          </DocLineItem>
        </DocLine>

        <header className="grid gap-8 pt-12 pb-16 sm:pt-20">
          <div className="max-w-(--measure)">
            <h1 className="text-display font-light">Motion lab</h1>
            <p className="mt-4 text-lg text-ink-muted">
              The manual moves like an instrument being switched on. Rules draw like a
              plotter pen, blocks print top to bottom, lamps warm up and readouts settle.
              Nothing floats, bounces or glows.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              <ThemeSwitch />
              <MotionControls />
            </div>
            <Button variant="link" asChild>
              <Link href="/lab">
                Component lab
                <ArrowUpRightIcon weight="light" />
              </Link>
            </Button>
          </div>
        </header>

        <main className="grid grid-cols-1 gap-(--section-gap) pb-(--section-gap)">
          <Chapter index={1} title="Timing" meta="4 durations · 3 curves">
            <Lede>
              Four durations, three curves, all from tokens.css. Exits run faster than
              entrances. Use ¼× above to watch any move on this page in slow motion.
            </Lede>
            <SpecTable
              rows={DURATIONS}
              caption="Table 1 — Durations"
              headers={{ label: "Step", value: "Duration", note: "Token · used for" }}
            />
            <EasingTracks />
          </Chapter>

          <Chapter index={2} title="Power-on" meta="Page load · ≈840 ms">
            <Lede>
              The one authored moment. It is pure CSS, so it runs on first paint before any
              script loads. Only the ornaments move: the running-head rule draws, its
              readouts settle and the status lamp warms up. The name and one-liner are
              never hidden, so the pitch is readable in the first frame.
            </Lede>
            <Replay caption="Replay remounts the plate, as a page load would.">
              <Figure number={1} title="Power-on · first paint" grid={false} bodyClassName="bg-bg">
                <div data-power-on className="grid gap-8">
                  <DocLine>
                    <DocLineItem emphasis>{profile.name}</DocLineItem>
                    <DocLineItem>
                      <ScrambleText trigger="mount" text="Operator's manual" />
                    </DocLineItem>
                    <DocLineItem className="hidden sm:flex">
                      <ScrambleText trigger="mount" text="Rev. 2026.10" />
                    </DocLineItem>
                    <DocLineItem>
                      <ScrambleText trigger="mount" text="p. 01" />
                    </DocLineItem>
                  </DocLine>
                  <div className="grid gap-4">
                    <p className="text-display font-light">{profile.name}</p>
                    <p className="max-w-(--measure) text-lg text-ink-muted">{profile.oneLiner}</p>
                  </div>
                  <div style={{ "--reveal-delay": "360ms" } as CSSProperties}>
                    <StatusChip state={profile.status.available ? "live" : "off"}>
                      {profile.status.label}
                    </StatusChip>
                  </div>
                </div>
              </Figure>
            </Replay>
            <Figure
              number={2}
              title="Power-on timing"
              meta="0–1000 ms"
              scroll
              note="Head readouts start when the page hydrates; the CSS parts start on first paint."
            >
              <PowerOnTiming />
            </Figure>
          </Chapter>

          <Chapter index={3} title="Chapters" meta="On scroll">
            <Lede>
              Every chapter enters the same way when its top crosses 88% of the viewport:
              the ink rule draws left to right, the heading re-reads, then the body prints
              top to bottom. Anything already on screen at first paint stays still.
            </Lede>
            <Replay>
              <div className="grid grid-cols-1 gap-6 border border-hairline p-4 sm:p-6">
                <Reveal variant="rules">
                  <SectionHeader
                    as="h3"
                    index={7}
                    title={<ScrambleText text="About" />}
                    meta="Specimen chapter"
                  />
                </Reveal>
                <Reveal delay={120}>
                  <p className="max-w-(--measure) text-base">{firstParagraph}</p>
                </Reveal>
              </div>
            </Replay>
          </Chapter>

          <Chapter index={4} title="Readouts" meta="Count-up · scramble">
            <Lede>
              Measured values count up once as their table enters, settling the way a meter
              does. The counting is hidden from screen readers, which only hear the final value.
            </Lede>
            <Replay>
              <SpecTable
                rows={profile.metrics}
                caption="Table 2 — Key figures"
                renderValue={(row) => <CountUp value={row.value} />}
              />
            </Replay>
          </Chapter>

          <Chapter index={5} title="Figures" meta="Plotter">
            <Lede>
              A Fig. plate plots itself like a pen plotter: structure first, then branches
              from left to right, then fills and labels. After that it stays live.
            </Lede>
            <RelayByte />
          </Chapter>

          <Chapter index={6} title="Lists" meta={`Stagger · ≤ ${stagger(99)} ms`}>
            <Lede>
              A list prints row by row, 60ms apart, with the total capped so a long list
              never makes the last row wait.
            </Lede>
            <Replay>
              <ul className="border-t border-hairline">
                {experience.map((entry, i) => (
                  <Reveal
                    key={entry.slug}
                    as="li"
                    delay={stagger(i)}
                    className="grid gap-1 border-b border-hairline py-4 sm:grid-cols-[10rem_1fr] sm:items-baseline"
                  >
                    <SpecLabel>{formatPeriod(entry.period)}</SpecLabel>
                    <span>
                      <span className="text-base">{entry.role}</span>
                      <span className="text-ink-muted"> · {entry.org}</span>
                    </span>
                  </Reveal>
                ))}
              </ul>
            </Replay>
          </Chapter>

          <Chapter index={7} title="State" meta="Switches · scan">
            <Lede>
              Panel switches latch, and the new position&apos;s lamp warms up. When the
              data behind a figure changes, it re-reads as a scan from left to right
              instead of cutting to the new values.
            </Lede>
            <ActivityScan />
          </Chapter>

          <Chapter index={8} title="Overlays" meta="Tooltip · dialog">
            <OverlaysDemo />
          </Chapter>

          <Chapter index={9} title="Reduced motion" meta="System setting">
            <Lede>
              With reduced motion on, nothing travels, draws or counts. Every move lands on
              its final state, and the changes that confirm an action stay. Use Reduced
              above to check it on this page.
            </Lede>
            <SpecTable
              rows={REDUCED}
              caption="Table 3 — Reduced-motion alternatives"
              headers={{ label: "Effect", value: "Full", note: "Reduced" }}
            />
          </Chapter>
        </main>
      </div>

      <TapeStripe label="End of manual" />
      <footer data-theme="dark" className="bg-bg text-ink">
        <div className="mx-auto grid w-full max-w-(--container) gap-2 px-(--gutter) py-12">
          <SpecLabel>Night shift · motion lab</SpecLabel>
          <p className="max-w-(--measure) text-lg font-light">{profile.oneLiner}</p>
        </div>
      </footer>
    </>
  );
}
