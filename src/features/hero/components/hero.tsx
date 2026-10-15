import type { ReactNode } from "react";
import {
  EnvelopeSimpleIcon,
  GithubLogoIcon,
  LinkedinLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import { Led } from "@/components/manual";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getProfile, type Profile } from "@/lib/content";
import { TypedName } from "./typed-name";

/** An icon-only key: the label is its accessible name and its tooltip. */
function IconLink({
  href,
  label,
  external = false,
  children,
}: {
  href: string;
  label: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" asChild>
          <a
            href={href}
            aria-label={label}
            {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
          >
            {children}
          </a>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Resume keys on the left (view in the browser, or download), then the
 * contact marks. The resume keys only print once a PDF is linked.
 */
function Actions({ name, links }: { name: string; links: Profile["links"] }) {
  const host = (url: string) => url.replace(/^https:\/\/(www\.)?/, "");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      {links.resume && (
        <div className="flex flex-wrap gap-2">
          <Button size="lg" className="font-semibold" asChild>
            <a href={links.resume} target="_blank" rel="noreferrer">
              View resume
            </a>
          </Button>
          <Button size="lg" variant="outline" className="font-semibold" asChild>
            <a
              href={links.resume}
              download={`${name.replace(/\s+/g, "-")}-Resume.pdf`}
            >
              Download
            </a>
          </Button>
        </div>
      )}
      <ul aria-label="Contact" className="flex items-center gap-1">
        <li>
          <IconLink href={links.linkedin} label={host(links.linkedin)} external>
            <LinkedinLogoIcon weight="light" className="size-5" />
          </IconLink>
        </li>
        <li>
          <IconLink href={links.github} label={host(links.github)} external>
            <GithubLogoIcon weight="light" className="size-5" />
          </IconLink>
        </li>
        <li>
          <IconLink href={`mailto:${links.email}`} label={links.email}>
            <EnvelopeSimpleIcon weight="light" className="size-5" />
          </IconLink>
        </li>
      </ul>
    </div>
  );
}

/**
 * The introduction: one sentence that says the name
 * out loud, then availability and the actions. Everything else is below.
 */
export function Hero() {
  const profile = getProfile();

  return (
    <header>
      <div className="grid max-w-4xl gap-8 pt-16 pb-4 sm:pt-28 sm:pb-8">
        <div className="grid gap-2 text-[clamp(1.75rem,1.2rem+2.4vw,3rem)] leading-[1.15] font-light tracking-[-0.02em]">
          <h1 className="text-ink-muted">
            Hi, I&apos;m{" "}
            <span className="text-ink">
              <TypedName text={`${profile.name}.`} />
            </span>
          </h1>
          <p className="text-ink-muted">{profile.oneLiner}</p>
        </div>
        <div className="grid gap-5">
          <p className="flex items-center gap-2.5 text-sm text-ink-muted">
            <Led state={profile.status.available ? "live" : "off"} />
            {profile.status.label}
          </p>
          <Actions name={profile.name} links={profile.links} />
        </div>
      </div>
    </header>
  );
}
