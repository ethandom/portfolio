import type { ReactNode } from "react";
import Image from "next/image";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Led, SpecLabel } from "@/components/manual";
import { Button } from "@/components/ui/button";
import { CopyEmail } from "@/features/contact";
import {
  CorePoints,
  DemoVideo,
  EntryFigure,
  PeriodLine,
} from "@/features/experience";
import { VoiceMemo } from "@/features/voice-memo";
import { voiceMemoEnabled } from "@/features/voice-memo/server";
import { type Panels, TryCommand } from "@/features/workbench";
import {
  formatPeriod,
  formatYearMonth,
  getExperience,
  getProfile,
  getProject,
  type Experience,
  type Profile,
  type Project,
} from "@/lib/content";
import { cn } from "@/lib/cn";
import { Keycaps, Part } from "./parts";

/**
 * The Workbench's 2D panels, from /content. The route renders them on the
 * server and hands them to the scene; the Workbench feature can't import
 * the features they're built from.
 */
export function getPanels(): Panels {
  const profile = getProfile();
  const experience = getExperience();
  const conturo = experience.find((e) => e.slug === "conturo");
  const google = experience.find((e) => e.slug === "google");
  const cpa = experience.find((e) => e.slug === "center-for-puppetry-arts");
  const relay = getProject("usb-relay-driver");
  const tempr = getProject("tempr");
  // The frame on the lounge wall holds the Worlds photos.
  const worlds = profile.away.find((a) =>
    a.photos?.some((p) => p.src.includes("worlds")),
  );

  return {
    ...(profile.reading && {
      reading: {
        kicker: "Now reading",
        title: profile.reading.title,
        body: <Reading reading={profile.reading} />,
      },
    }),
    ...(conturo && {
      conturo: {
        kicker: "Work History",
        title: conturo.org,
        body: <Conturo entry={conturo} />,
      },
    }),
    skills: {
      kicker: "Specifications",
      title: "Education & skills",
      body: <Skills skills={profile.skills} education={profile.education} />,
    },
    ...(relay && {
      relay: {
        kicker: "Projects",
        title: relay.title,
        body: <Relay project={relay} />,
      },
    }),
    ...(google && {
      google: {
        kicker: "Work History",
        title: [google.relation, google.mentor ?? google.org]
          .filter(Boolean)
          .join(" "),
        body: <Google entry={google} />,
      },
    }),
    ...(tempr && {
      tempr: {
        kicker: "Projects",
        title: tempr.title,
        body: <ProjectPanel project={tempr} />,
      },
    }),
    ...(cpa && {
      cpa: {
        kicker: "Work History",
        title: cpa.org,
        body: <PastRole entry={cpa} />,
      },
    }),
    contact: {
      kicker: "Contact",
      title: profile.contact.heading,
      body: <Contact profile={profile} />,
    },
    ...(worlds && {
      worlds: {
        kicker: "Away From the Keyboard",
        title: worlds.title,
        body: <Away entry={worlds} />,
      },
    }),
  };
}

/** One "Away From the Keyboard" entry, short: who with and when, then its sentence. */
function Away({ entry }: { entry: Profile["away"][number] }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        {entry.org && <SpecLabel as="p">{entry.org}</SpecLabel>}
        <SpecLabel as="p">{formatPeriod(entry.period)}</SpecLabel>
      </div>
      {entry.detail && <p className="text-sm text-ink">{entry.detail}</p>}
    </div>
  );
}

/** The book: its cover, who wrote it, and what it's about. */
function Reading({ reading }: { reading: NonNullable<Profile["reading"]> }) {
  const { cover } = reading;
  return (
    <div
      className={cn(
        "grid items-start gap-4",
        cover && "grid-cols-[7.5rem_minmax(0,1fr)]",
      )}
    >
      {cover && (
        <Image
          src={cover.src}
          alt={cover.alt}
          width={cover.width}
          height={cover.height}
          sizes="7.5rem"
          className="h-auto w-full border border-strong"
        />
      )}
      <div className="grid content-start gap-3">
        <dl className="grid content-start gap-1 text-sm">
          <dt className="font-mono text-label text-ink-muted uppercase">
            Author
          </dt>
          <dd className="text-ink">{reading.author}</dd>
        </dl>
        {reading.summary && (
          <p className="text-sm text-ink-muted">{reading.summary}</p>
        )}
      </div>
    </div>
  );
}

/**
 * What and when, as two mono lines under the title: the role, then the
 * dates. A current role gets the live lamp beside its "Present".
 */
function RoleLine({ entry }: { entry: Experience }) {
  return (
    <div className="grid gap-1.5">
      <SpecLabel as="p" tone="ink">
        {entry.role}
      </SpecLabel>
      <p className="flex items-center gap-2">
        {!entry.period.end && <Led state="live" />}
        <PeriodLine entry={entry} />
      </p>
    </div>
  );
}

function Conturo({ entry }: { entry: Experience }) {
  const project = entry.project ? getProject(entry.project) : undefined;
  return (
    <div className="grid gap-5">
      <RoleLine entry={entry} />
      {entry.demo && (
        <DemoVideo src={entry.demo} label={`${entry.org} product demo`} />
      )}
      <CorePoints entry={entry} size="sm" className="gap-3" />
      {entry.stack.length > 0 && (
        <Part label="Built with">
          <Keycaps names={entry.stack} label="Tools" />
        </Part>
      )}
      {project?.links.live && (
        <Button
          variant="link"
          asChild
          className="h-auto justify-self-start px-0"
        >
          <a href={project.links.live} target="_blank" rel="noreferrer">
            {new URL(project.links.live).host}
            <ArrowUpRightIcon weight="light" />
          </a>
        </Button>
      )}
    </div>
  );
}

const SKILL_GROUPS = [
  ["languages", "Languages"],
  ["frameworks", "Frameworks"],
  ["tools", "Tools"],
  ["libraries", "Libraries"],
] as const;

/** Where Ethan studies, then the skill groups as keycaps. */
function Skills({
  skills,
  education,
}: {
  skills: Profile["skills"];
  education: Profile["education"];
}) {
  return (
    <div className="grid gap-5">
      <Part label="Education">
        <div className="grid gap-1">
          <p className="text-base font-light text-ink">{education.school}</p>
          <p className="text-sm text-ink">
            {education.degree}
            {education.minor && `, minor in ${education.minor}`}
          </p>
          <p className="mt-1 flex items-baseline gap-2.5">
            <span className="font-mono text-label text-ink-muted uppercase">
              Graduates
            </span>
            <span className="font-mono text-sm text-ink tabular-nums">
              {formatYearMonth(education.graduation)}
            </span>
          </p>
        </div>
        {education.coursework.length > 0 && (
          <div className="grid gap-1.5">
            <h4 className="font-mono text-label text-ink-muted uppercase">
              Coursework
            </h4>
            <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm text-ink">
              {education.coursework.map((course) => (
                <li key={course}>{course}</li>
              ))}
            </ul>
          </div>
        )}
      </Part>
      {SKILL_GROUPS.filter(([key]) => skills[key].length > 0).map(
        ([key, label]) => (
          <Part key={key} label={label}>
            <Keycaps names={skills[key]} label={label} />
          </Part>
        ),
      )}
    </div>
  );
}

/** Lines to try on the bench monitor, from the CLI's own commands. */
const TRY = ["set 3 on", "toggle 1", "write-mask 0xA5", "reset", "help"];

/**
 * The relay driver, beside the board it drives, with command keys that run
 * on the monitor.
 */
function Relay({ project }: { project: Project }) {
  return (
    <ProjectPanel project={project}>
      <Part label="Try it on the monitor">
        <ul aria-label="relayctl commands" className="flex flex-wrap gap-2">
          {TRY.map((command) => (
            <li key={command}>
              <TryCommand command={command} />
            </li>
          ))}
        </ul>
      </Part>
    </ProjectPanel>
  );
}

/**
 * A project on the bench (the relay driver, Tempr): the part Ethan played
 * when it was a team's, when, what, the top impact lines, anything the
 * panel adds (`children`), the stack, the repo.
 */
function ProjectPanel({
  project,
  children,
}: {
  project: Project;
  children?: ReactNode;
}) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        {project.role && (
          <SpecLabel as="p" tone="ink">
            {project.role}
          </SpecLabel>
        )}
        <SpecLabel as="p">{formatPeriod(project.period)}</SpecLabel>
        <p className="text-sm text-ink">{project.summary}</p>
      </div>
      <CorePoints
        entry={{ highlights: project.highlights.slice(0, 3) }}
        size="sm"
        className="gap-3"
      />
      {children}
      {project.stack.length > 0 && (
        <Part label="Built with">
          <Keycaps names={project.stack} label="Tools" />
        </Part>
      )}
      {project.links.repo && (
        <Button
          variant="link"
          asChild
          className="h-auto justify-self-start px-0"
        >
          <a href={project.links.repo} target="_blank" rel="noreferrer">
            {new URL(project.links.repo).pathname.slice(1)}
            <ArrowUpRightIcon weight="light" />
          </a>
        </Button>
      )}
    </div>
  );
}

function Google({ entry }: { entry: Experience }) {
  return (
    <div className="grid gap-5">
      <RoleLine entry={entry} />
      <CorePoints entry={entry} size="sm" className="gap-3" />
      <EntryFigure entry={entry} number={1} compact />
    </div>
  );
}

/**
 * A past role, Work History's log row at panel size: the role and dates,
 * the core points, the tools, then the row's figure, fitted to the column.
 */
function PastRole({ entry }: { entry: Experience }) {
  return (
    <div className="grid gap-5">
      <RoleLine entry={entry} />
      <CorePoints entry={entry} size="sm" className="gap-3" />
      {entry.stack.length > 0 && (
        <Part label="Built with">
          <Keycaps names={entry.stack} label="Tools" />
        </Part>
      )}
      <EntryFigure entry={entry} number={1} compact />
    </div>
  );
}

/**
 * How to reach Ethan, opened from the mic: the footer's contact block at
 * panel size (availability, the note, the email keys, each channel spelled
 * out), then a voice memo where the endpoint takes them.
 */
function Contact({ profile }: { profile: Profile }) {
  const { status, links, contact } = profile;
  const host = (url: string) => url.replace(/^https:\/\/(www\.)?/, "");
  const channels = [
    { label: "Email", value: links.email, href: `mailto:${links.email}` },
    {
      label: "LinkedIn",
      value: host(links.linkedin),
      href: links.linkedin,
      external: true,
    },
    {
      label: "GitHub",
      value: host(links.github),
      href: links.github,
      external: true,
    },
  ];

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <p className="flex items-center gap-2 text-sm text-ink-muted">
          <Led state={status.available ? "live" : "off"} />
          {status.label}
        </p>
        <p className="text-sm text-ink">{contact.note}</p>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild>
            <a href={`mailto:${links.email}`}>Email me</a>
          </Button>
          <CopyEmail email={links.email} size="default" />
        </div>
      </div>
      <dl className="grid border-t border-strong">
        {channels.map((channel) => (
          <div
            key={channel.label}
            className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-baseline gap-3 border-b border-hairline py-2"
          >
            <dt className="font-mono text-label text-ink-muted uppercase">
              {channel.label}
            </dt>
            <dd className="min-w-0">
              <a
                href={channel.href}
                className="text-sm [overflow-wrap:anywhere] text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-accent"
                {...(channel.external
                  ? { target: "_blank", rel: "noreferrer" }
                  : {})}
              >
                {channel.value}
                {channel.external && (
                  <span aria-hidden className="ml-1 text-ink-muted">
                    ↗
                  </span>
                )}
              </a>
            </dd>
          </div>
        ))}
      </dl>
      {/* VoiceMemo brings its own heading and privacy line. Left out where
          its endpoint is off (production until VOICE_MEMO_ENABLED=1). */}
      {voiceMemoEnabled() && <VoiceMemo email={links.email} />}
    </div>
  );
}
