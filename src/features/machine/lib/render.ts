import {
  formatPeriod,
  formatYearMonth,
  type Experience,
  type Metric,
  type Profile,
  type Project,
} from "@/lib/content";

/**
 * The Machine view: the same content as the Manual, as plain markdown for
 * AI agents and LLM screening tools. Every fact comes from /content through
 * its Zod schema; nothing here is written for machines that isn't on the page.
 */

export type Content = {
  profile: Profile;
  projects: Project[];
  experience: Experience[];
};

/** One served markdown document; `path` is its public URL without ".md". */
export type MachineDoc = {
  path: string;
  title: string;
  /** One line for the llms.txt index. */
  blurb: string;
  markdown: string;
};

const join = (...blocks: (string | false | undefined)[]) =>
  blocks.filter(Boolean).join("\n\n") + "\n";

const list = (items: (string | false | undefined)[]) =>
  items.filter(Boolean).map((item) => `- ${item}`).join("\n");

/** A markdown table; the Note column only appears when some row has one. */
const metricsTable = (metrics: Metric[]) => {
  const notes = metrics.some((m) => m.note);
  const row = (cells: string[]) => `| ${cells.join(" | ")} |`;
  return [
    row(notes ? ["Metric", "Value", "Note"] : ["Metric", "Value"]),
    row(notes ? ["---", "---", "---"] : ["---", "---"]),
    ...metrics.map((m) => row(notes ? [m.label, m.value, m.note ?? ""] : [m.label, m.value])),
  ].join("\n");
};

/** Sentences joined with ". ", ending in exactly one period. */
const sentences = (parts: (string | undefined)[]) =>
  parts
    .filter(Boolean)
    .map((part) => part!.replace(/\.$/, ""))
    .join(". ") + ".";

const projectPath = (slug: string) => `projects/${slug}`;
const experiencePath = (slug: string) => `experience/${slug}`;

/** "Apprentice to Google VP" for apprenticeships, else "Founder, Conturo". */
export function experienceTitle(e: Experience): string {
  return e.relation && e.mentor ? `${e.relation} ${e.mentor}` : `${e.role}, ${e.org}`;
}

export function profileDoc(profile: Profile, site: string): MachineDoc {
  const { education: edu, links, skills } = profile;
  const degree = edu.minor ? `${edu.degree}, minor in ${edu.minor}` : edu.degree;

  return {
    path: "profile",
    title: "Profile",
    blurb: "Status, contact links, education, skills and life outside CS.",
    markdown: join(
      `# ${profile.name}`,
      `> ${profile.oneLiner}`,
      list([
        `Status: ${profile.status.label}`,
        `Location: ${profile.location}`,
        `Email: ${links.email}`,
        `Website: ${site}`,
        `GitHub: ${links.github}`,
        `LinkedIn: ${links.linkedin}`,
        links.resume && `Resume (PDF): ${site}${links.resume}`,
      ]),
      "## Education",
      list([
        `${edu.school}: ${degree}`,
        `Expected graduation: ${formatYearMonth(edu.graduation)}`,
        edu.coursework.length > 0 && `Coursework: ${edu.coursework.join(", ")}`,
      ]),
      "## Skills",
      list([
        `Languages: ${skills.languages.join(", ")}`,
        `Frameworks: ${skills.frameworks.join(", ")}`,
        `Tools: ${skills.tools.join(", ")}`,
        `Libraries: ${skills.libraries.join(", ")}`,
      ]),
      profile.away.length > 0 && "## Away from the keyboard",
      profile.away.length > 0 &&
        list(
          profile.away.map((a) =>
            sentences([
              `${a.title}${a.org ? `, ${a.org}` : ""} (${formatPeriod(a.period)})`,
              a.note,
              a.detail,
            ]),
          ),
        ),
    ),
  };
}

export function projectDoc(p: Project, site: string): MachineDoc {
  return {
    path: projectPath(p.slug),
    title: p.title,
    blurb: p.summary,
    markdown: join(
      `# ${p.title}`,
      `> ${p.summary}`,
      list([
        `Period: ${formatPeriod(p.period)}`,
        p.role && `Role: ${p.role}`,
        `Status: ${p.status}`,
        p.stack.length > 0 && `Stack: ${p.stack.join(", ")}`,
        p.links.live && `Live: ${p.links.live}`,
        p.links.repo && `Repository: ${p.links.repo}`,
        p.experience &&
          `Related work history: ${site}/${experiencePath(p.experience)}.md`,
      ]),
      "## Highlights",
      list(p.highlights),
      p.metrics.length > 0 && "## Metrics",
      p.metrics.length > 0 && metricsTable(p.metrics),
      p.body.trim() && p.body.trim(),
    ),
  };
}

export function experienceDoc(e: Experience, site: string): MachineDoc {
  const apprenticeship = Boolean(e.relation && e.mentor);
  return {
    path: experiencePath(e.slug),
    title: experienceTitle(e),
    blurb: `${e.org}, ${formatPeriod(e.period)}`,
    markdown: join(
      `# ${experienceTitle(e)}`,
      list([
        `Organization: ${e.org}`,
        `${apprenticeship ? "Focus" : "Role"}: ${e.role}`,
        apprenticeship && "Type: apprenticeship",
        `Period: ${formatPeriod(e.period)}`,
        e.location && `Location: ${e.location}`,
        e.stack.length > 0 && `Stack: ${e.stack.join(", ")}`,
        e.project && `Project write-up: ${site}/${projectPath(e.project)}.md`,
      ]),
      "## Highlights",
      list(e.highlights),
      e.body.trim() && e.body.trim(),
    ),
  };
}

/** Every served document, in reading order: profile, work history, projects. */
export function machineDocs({ profile, projects, experience }: Content, site: string) {
  return [
    profileDoc(profile, site),
    ...experience.map((e) => experienceDoc(e, site)),
    ...projects.map((p) => projectDoc(p, site)),
  ];
}

/** /index.md (and `/` with Accept: text/markdown): every document in one file. */
export function indexDoc(content: Content, site: string): MachineDoc {
  const [profile, ...rest] = machineDocs(content, site);
  // Nest each document one heading level down under its section.
  const demote = (md: string) => md.replace(/^(#+) /gm, "#$1 ");
  const section = (title: string, prefix: string) => {
    const docs = rest.filter((d) => d.path.startsWith(prefix));
    return docs.length > 0 && [`## ${title}`, ...docs.map((d) => demote(d.markdown).trim())].join("\n\n");
  };

  return {
    path: "index",
    title: "Everything on one page",
    blurb: "The profile, work history and projects in a single file.",
    markdown: join(
      profile.markdown.trim(),
      section("Work history", "experience/"),
      section("Projects", "projects/"),
    ),
  };
}

/** /llms.txt, per llmstxt.org: H1, blockquote summary, then link sections. */
export function llmsTxt(content: Content, site: string): string {
  const { profile } = content;
  const docs = machineDocs(content, site);
  const link = (d: MachineDoc) => `- [${d.title}](${site}/${d.path}.md): ${d.blurb}`;
  const section = (title: string, prefix: string) => {
    const matching = docs.filter((d) => d.path.startsWith(prefix));
    return matching.length > 0 && [`## ${title}`, ...matching.map(link)].join("\n");
  };
  const edu = profile.education;

  return join(
    `# ${profile.name}`,
    `> ${profile.oneLiner} ${edu.degree} student at ${edu.school}, graduating ${formatYearMonth(edu.graduation)}. ${profile.status.label}.`,
    `Plain-markdown versions of everything on ${site}. Contact: ${profile.links.email}.`,
    ["## Profile", link(docs[0]), link(indexDoc(content, site))].join("\n"),
    section("Work history", "experience/"),
    section("Projects", "projects/"),
  );
}
