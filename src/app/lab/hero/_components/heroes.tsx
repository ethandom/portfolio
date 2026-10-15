import type { ReactNode } from "react";
import { ArrowUpRightIcon, DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { Led } from "@/components/manual";
import { cn } from "@/lib/cn";
import { DisplayName } from "./display-name";
import type { HeroData } from "./hero-data";

type HeroProps = { data: HeroData; as?: "h1" | "h2" };

const link =
  "inline-flex items-center gap-1.5 text-ink underline decoration-hairline underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-strong";

/** Resume, LinkedIn, GitHub, email: plain text links, not a row of buttons. */
function Links({ data, className }: { data: HeroData; className?: string }) {
  return (
    <ul className={cn("flex flex-wrap gap-x-6 gap-y-2 text-base", className)}>
      <li>
        <a href={data.resume} download className={link}>
          Resume
          <DownloadSimpleIcon weight="light" className="size-4 text-ink-muted" />
        </a>
      </li>
      <li>
        <a href={data.links.linkedin} target="_blank" rel="noreferrer" className={link}>
          LinkedIn
          <ArrowUpRightIcon weight="light" className="size-4 text-ink-muted" />
        </a>
      </li>
      <li>
        <a href={data.links.github} target="_blank" rel="noreferrer" className={link}>
          GitHub
          <ArrowUpRightIcon weight="light" className="size-4 text-ink-muted" />
        </a>
      </li>
      <li>
        <a href={`mailto:${data.links.email}`} className={link}>
          Email
        </a>
      </li>
    </ul>
  );
}

/** One quiet line: the lamp is the only color in the hero. */
function Availability({ data }: { data: HeroData }) {
  return (
    <p className="flex items-center gap-2.5 text-sm text-ink-muted">
      <Led state={data.status.available ? "live" : "off"} />
      {data.status.label}
    </p>
  );
}

function Shell({ children, className }: { children: ReactNode; className?: string }) {
  return <header className={cn("pt-16 pb-12 sm:pt-28 sm:pb-20", className)}>{children}</header>;
}

/** A · Plain. Name, one sentence, links. Nothing to decode. */
export function PlainHero({ data, as: Heading = "h1" }: HeroProps) {
  return (
    <Shell className="grid max-w-2xl gap-6">
      <Heading className="text-display font-light">
        <DisplayName name={data.name} />
      </Heading>
      <p className="text-lg text-ink-muted">{data.oneLiner}</p>
      <Availability data={data} />
      <Links data={data} className="pt-2" />
    </Shell>
  );
}

/** B · Introduction. The name is part of a sentence, said out loud. */
export function IntroHero({ data, as: Heading = "h1" }: HeroProps) {
  const first = data.name.split(" ")[0];
  return (
    <Shell className="grid max-w-3xl gap-8">
      <Heading className="text-[clamp(1.75rem,1.2rem+2.4vw,3rem)] leading-[1.15] font-light tracking-[-0.02em] text-ink-muted">
        Hi, I&apos;m <span className="text-ink">{first}</span>.{" "}
        {data.oneLiner}
      </Heading>
      <div className="grid gap-4">
        <Availability data={data} />
        <Links data={data} />
      </div>
    </Shell>
  );
}

/**
 * C · Kernel to interface. The one-liner is the headline, and the range is
 * in the type: "kernel" is set in mono, "interface" in the display sans.
 */
export function RangeHero({ data, as: Heading = "h1" }: HeroProps) {
  const parts = data.oneLiner.split(/(kernel|interface)/);
  return (
    <Shell className="grid max-w-4xl gap-8">
      <Heading className="text-lg font-medium text-ink">{data.name}</Heading>
      <p className="text-[clamp(2rem,1.3rem+3vw,3.75rem)] leading-[1.08] font-light tracking-[-0.025em] text-balance">
        {parts.map((part, i) =>
          part === "kernel" ? (
            <span key={i} className="font-mono text-[0.86em] font-normal tracking-[-0.04em]">
              kernel
            </span>
          ) : (
            part
          ),
        )}
      </p>
      <div className="grid gap-4">
        <Availability data={data} />
        <Links data={data} />
      </div>
    </Shell>
  );
}

/**
 * D · Cover. The manual's cover as a poster: the name as large as the
 * sheet allows, one ink rule, then the sentence and the links on one line.
 */
export function CoverHero({ data, as: Heading = "h1" }: HeroProps) {
  return (
    <Shell>
      <Heading className="text-[clamp(3rem,1rem+6.6vw,6rem)] leading-[0.9] font-light tracking-[-0.04em]">
        <DisplayName name={data.name} />
      </Heading>
      <span aria-hidden data-rule className="mt-8 block h-px bg-strong sm:mt-12" />
      <div className="grid gap-6 pt-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:gap-12">
        <div className="grid gap-3">
          <p className="max-w-[44ch] text-lg text-ink">{data.oneLiner}</p>
          <Availability data={data} />
        </div>
        <Links data={data} className="md:pt-1.5" />
      </div>
    </Shell>
  );
}
