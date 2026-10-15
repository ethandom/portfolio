import { formatPeriod, formatYearMonth } from "@/lib/content";
import { experienceTitle, type Content } from "./render";

export type Faq = { question: string; answer: string };

const series = (items: string[]) =>
  items.length <= 2
    ? items.join(" and ")
    : `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;

const noPeriod = (text: string) => text.replace(/\.$/, "");

/**
 * The FAQ on /ai. Every answer is assembled from /content, so it can't say
 * anything the Manual doesn't.
 */
export function faq({ profile, projects, experience }: Content, site: string): Faq[] {
  const { name, education: edu, links, skills, status } = profile;
  const first = name.split(" ")[0];
  const current = experience.find((e) => !e.period.end);
  const degree = edu.minor ? `${edu.degree} (minor in ${edu.minor})` : edu.degree;

  return [
    {
      question: `Who is ${name}?`,
      answer: [
        `${name} is a ${degree} student at ${edu.school}, graduating ${formatYearMonth(edu.graduation)}, based in ${profile.location}.`,
        current && `Currently ${current.role} at ${current.org}.`,
      ]
        .filter(Boolean)
        .join(" "),
    },
    {
      question: `Is ${first} available?`,
      answer: `${status.available ? "Yes" : "Not right now"}: ${noPeriod(status.label).toLowerCase()}. Email ${links.email}.`,
    },
    {
      question: `Where has ${first} worked?`,
      answer: `${series(
        experience.map((e) =>
          e.relation && e.mentor
            ? `${experienceTitle(e)} (${formatPeriod(e.period)})`
            : `${e.role} at ${e.org} (${formatPeriod(e.period)})`,
        ),
      )}.`,
    },
    {
      question: `What has ${first} built?`,
      answer: projects.map((p) => `${p.title}: ${noPeriod(p.summary)}.`).join(" "),
    },
    {
      question: `What does ${first} build with?`,
      answer: `Languages: ${series(skills.languages)}. Frameworks: ${series(skills.frameworks)}. Tools: ${series(skills.tools)}.`,
    },
    {
      question: `How do I contact ${first}?`,
      answer: [
        `Email ${links.email}, or find ${first} on GitHub (${links.github}) and LinkedIn (${links.linkedin}).`,
        links.resume && `The resume is at ${site}${links.resume}.`,
      ]
        .filter(Boolean)
        .join(" "),
    },
    {
      question: "Is there a markdown version of this site?",
      answer: `Yes. ${site}/llms.txt indexes every document, ${site}/index.md has everything in one file, and ${site}/ answers in markdown to requests with Accept: text/markdown.`,
    },
  ];
}
