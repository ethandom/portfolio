import Link from "next/link";
import { Led, SectionHeader, TapeStripe } from "@/components/manual";
import { Reveal, ScrambleText } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { getProfile } from "@/lib/content";
import { CopyEmail } from "./copy-email";

type Channel = {
  label: string;
  value: string;
  href: string;
  external?: boolean;
};

/**
 * The last chapter, printed on the Night Shift footer after the tape:
 * availability, one line on how to reach out, then every channel spelled out.
 */
export function Contact({ chapter }: { chapter: number }) {
  const { status, location, links, contact } = getProfile();
  const host = (url: string) => url.replace(/^https:\/\/(www\.)?/, "");

  const channels: Channel[] = [
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
    ...(links.resume
      ? [{ label: "Resume", value: "PDF", href: links.resume, external: true }]
      : []),
  ];

  return (
    <>
      <TapeStripe label="End of manual" />
      <footer
        id="contact"
        aria-labelledby="contact-h"
        data-theme="dark"
        className="scroll-mt-8 bg-bg text-ink"
      >
        <div className="mx-auto grid w-full max-w-(--container) grid-cols-1 gap-10 px-(--gutter) pt-16 pb-[calc(--spacing(10)+var(--dock-room))]">
          <Reveal variant="rules">
            <SectionHeader
              index={chapter}
              id="contact-h"
              title={<ScrambleText text="Contact" />}
            />
          </Reveal>

          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,30rem)]">
            <div className="grid content-start gap-6">
              <p className="flex items-center gap-2.5 text-sm text-ink-muted">
                <Led state={status.available ? "live" : "off"} />
                {status.label}
              </p>
              <p className="text-[clamp(1.75rem,1.2rem+2.4vw,3rem)] leading-[1.15] font-light tracking-[-0.02em] text-balance">
                {contact.heading}
              </p>
              <p className="max-w-(--measure) text-lg text-ink-muted">
                {contact.note}
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="lg" asChild>
                  <a href={`mailto:${links.email}`}>Email me</a>
                </Button>
                <CopyEmail email={links.email} />
              </div>
            </div>

            <dl className="grid content-start border-t border-strong">
              {channels.map((channel) => (
                <div
                  key={channel.label}
                  className="grid grid-cols-1 gap-1 border-b border-hairline py-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-baseline"
                >
                  <dt className="font-mono text-label text-ink-muted uppercase">
                    {channel.label}
                  </dt>
                  <dd className="min-w-0">
                    <a
                      href={channel.href}
                      className="text-base [overflow-wrap:anywhere] text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-accent"
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
              <div className="grid grid-cols-1 gap-1 border-b border-strong py-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:items-baseline">
                <dt className="font-mono text-label text-ink-muted uppercase">
                  Based in
                </dt>
                <dd className="text-base text-ink">{location}</dd>
              </div>
            </dl>
          </div>

          <p className="flex flex-wrap justify-between gap-x-6 gap-y-1 border-t border-hairline pt-4 font-mono text-label text-ink-muted uppercase">
            <Link
              href="/ai"
              className="transition-colors duration-(--dur-fast) hover:text-ink"
            >
              Are you a robot?{" "}
              <span className="text-accent-text underline decoration-1 underline-offset-4">
                Machine view →
              </span>
            </Link>
          </p>
        </div>
      </footer>
    </>
  );
}
