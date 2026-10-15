import NextLink from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import {
  formatPeriod,
  formatYearMonth,
  getExperience,
  getProfile,
  getProjects,
} from "@/lib/content";
import { banner, bannerShapes } from "../lib/banner";
import { faq } from "../lib/faq";
import { experienceTitle } from "../lib/render";

/**
 * /ai: the Manual as a plain-text printout, for agents, crawlers and people
 * who'd rather read it raw. Modeled on basement.studio's machine view, in the
 * Night Shift palette: orange text, bone for headings, muted keys. It prints
 * itself top to bottom on load (`[data-readout]` in motion.css).
 */

const SECTIONS = [
  ["about", "About"],
  ["work", "Work history"],
  ["projects", "Projects"],
  ["away", "Away"],
  ["faq", "FAQ"],
  ["contact", "Contact"],
  ["agents", "For agents"],
] as const;

const linkClass =
  "underline decoration-1 underline-offset-4 transition-colors duration-(--dur-fast) hover:text-ink";

const slug = (title: string) => title.toLowerCase().replace(/\s+/g, "_");

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-6 gap-3">
      <h2 id={`${id}-h`} className="overflow-hidden whitespace-nowrap text-ink-muted">
        <span aria-hidden>── </span>
        {slug(title)}
        <span aria-hidden> {"─".repeat(120)}</span>
      </h2>
      {children}
    </section>
  );
}

type Row = { key: string; value: ReactNode };

/** "name .......... value": keys padded with leaders to one column. */
function Fields({ rows }: { rows: (Row | false | "" | undefined)[] }) {
  const shown = rows.filter((row): row is Row => Boolean(row));
  const width = Math.max(...shown.map((row) => row.key.length)) + 4;
  return (
    <dl className="grid gap-1">
      {shown.map(({ key, value }) => (
        <div key={key} className="flex">
          <dt className="shrink-0 whitespace-pre text-ink-muted">
            {`${key} ${".".repeat(width - key.length - 1)} `}
          </dt>
          <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Pages go through next/link; files (.md, .txt, .pdf) and other sites don't. */
function Link({ href, children }: { href: string; children: ReactNode }) {
  const external = href.startsWith("https://");
  if (href.startsWith("/") && !/\.\w+$/.test(href))
    return (
      <NextLink href={href} className={linkClass}>
        {children}
      </NextLink>
    );
  return (
    <a
      href={href}
      className={linkClass}
      {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

const Tags = ({ items }: { items: string[] }) =>
  items.length > 0 && (
    <p className="text-ink-muted">{items.map((item) => `[${item}]`).join(" ")}</p>
  );

/** "* Title" entries: work history, projects and life away from the keyboard. */
function Entry({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <li className="grid gap-1">
      <h3 className="text-ink">* {title}</h3>
      {children}
    </li>
  );
}

/** The first name in block letters, drawn in the accent like basement's logo. */
function Banner({ art }: { art: string }) {
  const { width, height, cell, blocks, path } = bannerShapes(art);
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${width} ${height}`}
      className="block h-auto w-full text-accent"
      style={{ maxWidth: `${(width / cell.w) * 0.6 * 16}px` }}
    >
      <g fill="currentColor">
        {blocks.map(({ x, y }) => (
          <rect key={`${x},${y}`} x={x} y={y} width={cell.w + 0.05} height={cell.h + 0.05} />
        ))}
      </g>
      <path d={path} fill="none" stroke="currentColor" strokeWidth={0.75} />
    </svg>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="grid gap-1">
    {items.map((item) => (
      <li key={item} className="flex gap-2">
        <span aria-hidden className="text-ink-muted">
          -
        </span>
        <span className="min-w-0">{item}</span>
      </li>
    ))}
  </ul>
);

export function MachinePage() {
  const content = {
    profile: getProfile(),
    projects: getProjects(),
    experience: getExperience(),
  };
  const { profile, projects, experience } = content;
  const { education: edu, links, skills } = profile;
  const site = siteConfig.url;
  const art = banner(profile.name.split(" ")[0]);
  const host = (url: string) => url.replace(/^https:\/\/(www\.)?/, "");

  const docs = [
    ["llms.txt", "/llms.txt"],
    ["index.md", "/index.md"],
    ["profile.md", "/profile.md"],
    ...experience.map((e) => [`experience/${e.slug}.md`, `/experience/${e.slug}.md`]),
    ...projects.map((p) => [`projects/${p.slug}.md`, `/projects/${p.slug}.md`]),
  ];

  return (
    <div
      data-theme="dark"
      className="flex min-h-dvh flex-1 flex-col bg-bg font-mono text-[13px] leading-normal text-accent-text uppercase"
    >
      <main
        data-readout
        className="mx-auto grid w-full max-w-[42rem] grid-cols-1 gap-8 px-(--gutter) pt-10 pb-16"
      >
        <header className="grid gap-4">
          {art && (
            <NextLink href="/ai" aria-label="Machine view, top">
              <Banner art={art} />
            </NextLink>
          )}
          <nav aria-label="Sections" className="flex flex-wrap gap-x-4 gap-y-1">
            <span aria-current="page" className="-mx-1 bg-accent px-1 text-bg">
              /ai
            </span>
            {SECTIONS.map(([id, label]) => (
              <a key={id} href={`#${id}`} className={linkClass}>
                /{slug(label)}
              </a>
            ))}
            <Link href="/">
              human view <span aria-hidden>↗</span>
            </Link>
          </nav>
        </header>

        <div className="grid gap-4">
          <h1 className="text-ink">{siteConfig.domain} :: machine-readable index</h1>
          <p className="text-ink-muted">
            # The Manual as plain text, for AI agents, crawlers and anyone who
            would rather read it raw.
          </p>
        </div>

        <Section id="about" title="About">
          <Fields
            rows={[
              { key: "name", value: profile.name },
              { key: "status", value: profile.status.label },
              { key: "location", value: profile.location },
              { key: "school", value: edu.school },
              { key: "degree", value: edu.degree },
              edu.minor && { key: "minor", value: edu.minor },
              { key: "graduation", value: formatYearMonth(edu.graduation) },
              { key: "coursework", value: edu.coursework.join(", ") },
              { key: "languages", value: skills.languages.join(", ") },
              { key: "frameworks", value: skills.frameworks.join(", ") },
              { key: "tools", value: skills.tools.join(", ") },
              { key: "libraries", value: skills.libraries.join(", ") },
            ]}
          />
          <p>{profile.oneLiner}</p>
        </Section>

        <Section id="work" title="Work history">
          <ul className="grid gap-5">
            {experience.map((e) => (
              <Entry key={e.slug} title={experienceTitle(e)}>
                <p className="text-ink-muted">
                  {[e.org, e.relation ? e.role : undefined, formatPeriod(e.period), e.location]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <Bullets items={e.highlights} />
                <Tags items={e.stack} />
                <p>
                  <Link href={`/experience/${e.slug}.md`}>→ experience/{e.slug}.md</Link>
                </p>
              </Entry>
            ))}
          </ul>
        </Section>

        <Section id="projects" title="Projects">
          <ul className="grid gap-5">
            {projects.map((p) => (
              <Entry key={p.slug} title={p.title}>
                <p>{p.summary}</p>
                <p className="text-ink-muted">
                  {[formatPeriod(p.period), p.role, p.status].filter(Boolean).join(" · ")}
                </p>
                <Bullets items={p.highlights} />
                {p.metrics.length > 0 && (
                  <Fields rows={p.metrics.map((m) => ({ key: m.label, value: m.value }))} />
                )}
                <Tags items={p.stack} />
                <p className="flex flex-wrap gap-x-4">
                  {p.links.live && <Link href={p.links.live}>live: {host(p.links.live)}</Link>}
                  {p.links.repo && <Link href={p.links.repo}>repo: {host(p.links.repo)}</Link>}
                  <Link href={`/projects/${p.slug}.md`}>→ projects/{p.slug}.md</Link>
                </p>
              </Entry>
            ))}
          </ul>
        </Section>

        {profile.away.length > 0 && (
          <Section id="away" title="Away from the keyboard">
            <ul className="grid gap-5">
              {profile.away.map((a) => (
                <Entry key={a.title} title={a.title}>
                  <p className="text-ink-muted">
                    {[a.org, formatPeriod(a.period)].filter(Boolean).join(" · ")}
                  </p>
                  {a.note && <p>{a.note}</p>}
                  {a.detail && <p>{a.detail}</p>}
                </Entry>
              ))}
            </ul>
          </Section>
        )}

        <Section id="faq" title="FAQ">
          <ul className="grid gap-4">
            {faq(content, site).map(({ question, answer }) => (
              <Entry key={question} title={question}>
                <p>{answer}</p>
              </Entry>
            ))}
          </ul>
        </Section>

        <Section id="contact" title="Contact">
          <Fields
            rows={[
              {
                key: "email",
                value: <Link href={`mailto:${links.email}`}>{links.email}</Link>,
              },
              { key: "github", value: <Link href={links.github}>{host(links.github)}</Link> },
              {
                key: "linkedin",
                value: <Link href={links.linkedin}>{host(links.linkedin)}</Link>,
              },
              links.resume && {
                key: "resume",
                value: <Link href={links.resume}>{links.resume}</Link>,
              },
              { key: "location", value: profile.location },
            ]}
          />
        </Section>

        <Section id="agents" title="For agents">
          <Fields
            rows={docs.map(([name, href]) => ({
              key: name,
              value: <Link href={href}>{href}</Link>,
            }))}
          />
          <p className="text-ink-muted">
            # Every document is plain markdown. `/` answers in markdown too,
            when asked with Accept: text/markdown.
          </p>
        </Section>

        <footer className="grid gap-1 pt-4 text-ink-muted">
          <p>
            © {profile.name} —{" "}
            <Link href="/">back to the human view</Link>
          </p>
          <p aria-hidden>{"/* EOF */"}</p>
        </footer>
      </main>
    </div>
  );
}
