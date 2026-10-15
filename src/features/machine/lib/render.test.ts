import { describe, expect, it } from "vitest";
import { getExperience, getProfile, getProjects } from "@/lib/content";
import { indexDoc, llmsTxt, machineDocs } from "./render";

const site = "https://example.test";
const content = {
  profile: getProfile(),
  projects: getProjects(),
  experience: getExperience(),
};
const docs = [indexDoc(content, site), ...machineDocs(content, site)];
const served = new Set(docs.map((d) => `${site}/${d.path}.md`));
const mdLinks = (text: string) =>
  [...text.matchAll(/https:\/\/example\.test\/[\w/-]+\.md/g)].map((m) => m[0]);

describe("machine view", () => {
  it("serves one document per content file, plus the index", () => {
    expect(docs).toHaveLength(2 + content.projects.length + content.experience.length);
    expect(new Set(docs.map((d) => d.path)).size).toBe(docs.length);
  });

  it("links llms.txt only to documents that are served", () => {
    const links = mdLinks(llmsTxt(content, site));
    expect(links.length).toBe(docs.length);
    for (const link of links) expect(served).toContain(link);
  });

  it("cross-links documents only to documents that are served", () => {
    for (const doc of docs)
      for (const link of mdLinks(doc.markdown)) expect(served).toContain(link);
  });

  it("puts every document into the index", () => {
    const index = docs[0].markdown;
    for (const doc of docs.slice(1)) {
      const heading = doc.markdown.split("\n")[0].replace(/^#+ /, "");
      expect(index).toContain(heading);
    }
  });

  it("never prints a phone number or a personal Gmail", () => {
    for (const text of [llmsTxt(content, site), ...docs.map((d) => d.markdown)]) {
      expect(text).not.toMatch(/\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/);
      expect(text).not.toMatch(/@gmail\.com/i);
    }
  });

  it("labels apprenticeships as apprenticeships", () => {
    for (const e of content.experience.filter((e) => e.relation)) {
      const doc = docs.find((d) => d.path === `experience/${e.slug}`);
      expect(doc?.markdown).toContain("Type: apprenticeship");
    }
  });
});
