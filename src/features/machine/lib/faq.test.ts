import { describe, expect, it } from "vitest";
import { getExperience, getProfile, getProjects } from "@/lib/content";
import { banner } from "./banner";
import { faq } from "./faq";

const content = {
  profile: getProfile(),
  projects: getProjects(),
  experience: getExperience(),
};

describe("/ai", () => {
  it("answers every FAQ from content", () => {
    const answers = faq(content, "https://example.test");
    for (const { answer } of answers) expect(answer.trim()).not.toBe("");
    const all = answers.map((a) => a.answer).join(" ");
    expect(all).toContain(content.profile.links.email);
    for (const p of content.projects) expect(all).toContain(p.title);
  });

  it("draws the first name in block letters", () => {
    const art = banner(content.profile.name.split(" ")[0]);
    expect(art).not.toBeNull();
    const rows = art!.split("\n");
    expect(new Set(rows.map((row) => row.length)).size).toBe(1);
    expect(banner("Q")).toBeNull();
  });
});
