import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  formatPeriod,
  getActivitySnapshot,
  getExperience,
  getProfile,
  getProjects,
} from ".";
import { experienceSchema, profileSchema, projectSchema } from "./schemas";

// Loading everything is the build-time validation: any bad frontmatter throws here.
describe("content", () => {
  const profile = getProfile();
  const projects = getProjects();
  const experience = getExperience();

  it("links a resume that exists in /public", () => {
    const { resume } = profile.links;
    if (!resume) return;
    expect(fs.existsSync(path.join(process.cwd(), "public", resume))).toBe(true);
  });

  it("links photos that exist in /public", () => {
    const missing = profile.away
      .flatMap((r) => r.photos)
      .filter((p) => !fs.existsSync(path.join(process.cwd(), "public", p.src)))
      .map((p) => p.src);
    expect(missing).toEqual([]);
  });

  it("loads every file", () => {
    expect(profile.name).toBeTruthy();
    expect(projects.length).toBeGreaterThan(0);
    expect(experience.length).toBeGreaterThan(0);
    expect(getActivitySnapshot()).toBeTruthy();
  });

  it("has unique order values", () => {
    for (const list of [projects, experience]) {
      const orders = list.map((e) => e.order);
      expect(new Set(orders).size).toBe(orders.length);
    }
  });

  it("cross-links projects and experience by real slugs", () => {
    const projectSlugs = new Set(projects.map((p) => p.slug));
    const experienceSlugs = new Set(experience.map((e) => e.slug));
    for (const p of projects) {
      if (p.experience) expect(experienceSlugs).toContain(p.experience);
    }
    for (const e of experience) {
      if (e.project) expect(projectSlugs).toContain(e.project);
    }
  });

  it("names the book being read, if any, with its author", () => {
    if (!profile.reading) return;
    expect(profile.reading.title.trim()).toBe(profile.reading.title);
    expect(profile.reading.author.trim()).toBe(profile.reading.author);
  });

  it("features at least one project", () => {
    expect(projects.some((p) => p.featured)).toBe(true);
  });

  // Public repo: keep personal contact details out of /content.
  it("contains no phone numbers", () => {
    const text = JSON.stringify({ profile, projects, experience });
    expect(text).not.toMatch(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/);
  });
});

describe("schemas", () => {
  it("rejects bad dates", () => {
    const base = projectSchema.safeParse({
      title: "x",
      summary: "x",
      kind: ["web"],
      period: { start: "2026-13" },
      stack: ["x"],
      status: "shipped",
      order: 1,
      highlights: ["x"],
    });
    expect(base.success).toBe(false);
  });

  it("rejects end before start", () => {
    const r = projectSchema.shape.period.safeParse({
      start: "2026-02",
      end: "2025-01",
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-https links", () => {
    const r = profileSchema.shape.links.safeParse({
      email: "a@b.co",
      github: "http://github.com/x",
      linkedin: "https://linkedin.com/in/x",
      resume: "javascript:alert(1)",
    });
    expect(r.success).toBe(false);
  });

  it("rejects figure ids no feature can draw", () => {
    expect(projectSchema.shape.figure.safeParse("orrery").success).toBe(false);
    expect(
      experienceSchema.shape.figure.safeParse({ id: "orrery", title: "x" })
        .success,
    ).toBe(false);
    expect(
      experienceSchema.shape.figure.safeParse({ id: "data-pipeline", title: "" })
        .success,
    ).toBe(false);
  });

  it("needs a title and an author for the book being read", () => {
    const { reading } = profileSchema.shape;
    expect(reading.safeParse(undefined).success).toBe(true);
    expect(
      reading.safeParse({ title: "A Book", author: "An Author" }).success,
    ).toBe(true);
    expect(reading.safeParse({ title: "A Book" }).success).toBe(false);
    expect(reading.safeParse({ title: "", author: "An Author" }).success).toBe(
      false,
    );
  });

  it("rejects a non-https demo", () => {
    expect(
      experienceSchema.shape.demo.safeParse("http://example.com/a.mp4").success,
    ).toBe(false);
  });
});

describe("formatPeriod", () => {
  it("formats ranges, ongoing and single months", () => {
    expect(formatPeriod({ start: "2025-10", end: "2025-12" })).toBe("Oct 2025 – Dec 2025");
    expect(formatPeriod({ start: "2026-02" })).toBe("Feb 2026 – Present");
    expect(formatPeriod({ start: "2026-02", end: "2026-02" })).toBe("Feb 2026");
  });
});
