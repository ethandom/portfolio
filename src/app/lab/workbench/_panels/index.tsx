import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { Led, SpecLabel } from "@/components/manual";
import { Button } from "@/components/ui/button";
import {
  CorePoints,
  DemoVideo,
  EntryFigure,
  PeriodLine,
} from "@/features/experience";
import { type Panels, TryCommand } from "@/features/workbench";
import {
  formatPeriod,
  getExperience,
  getProfile,
  getProject,
  type Experience,
  type Profile,
  type Project,
} from "@/lib/content";
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
  const relay = getProject("usb-relay-driver");

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
      title: "Skills",
      body: <Skills skills={profile.skills} />,
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
  };
}

function Reading({ reading }: { reading: NonNullable<Profile["reading"]> }) {
  return (
    <dl className="grid grid-cols-[5rem_minmax(0,1fr)] items-baseline gap-x-4 text-sm">
      <dt className="font-mono text-label text-ink-muted uppercase">Author</dt>
      <dd className="text-ink">{reading.author}</dd>
    </dl>
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

function Skills({ skills }: { skills: Profile["skills"] }) {
  return (
    <div className="grid gap-5">
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
 * The relay driver, beside the board it drives: when, what, the top
 * impact lines, command keys that run on the monitor, the stack, the repo.
 */
function Relay({ project }: { project: Project }) {
  return (
    <div className="grid gap-5">
      <div className="grid gap-1.5">
        <SpecLabel as="p">{formatPeriod(project.period)}</SpecLabel>
        <p className="text-sm text-ink">{project.summary}</p>
      </div>
      <CorePoints
        entry={{ highlights: project.highlights.slice(0, 3) }}
        size="sm"
        className="gap-3"
      />
      <Part label="Try it on the monitor">
        <ul aria-label="relayctl commands" className="flex flex-wrap gap-2">
          {TRY.map((command) => (
            <li key={command}>
              <TryCommand command={command} />
            </li>
          ))}
        </ul>
      </Part>
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
