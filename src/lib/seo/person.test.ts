import { describe, expect, it } from "vitest";
import { getExperience, getProfile, getProjects } from "@/lib/content";
import { personJsonLd } from "./person";

describe("personJsonLd", () => {
  const person = personJsonLd(
    { profile: getProfile(), experience: getExperience(), projects: getProjects() },
    "https://example.test",
  );

  it("describes the current role from the entry with no end date", () => {
    const current = getExperience().find((e) => !e.period.end);
    expect(person.worksFor?.name).toBe(current?.org);
  });

  it("only links https profiles", () => {
    for (const url of person.sameAs) expect(url).toMatch(/^https:\/\//);
  });

  it("serializes without undefined holes", () => {
    expect(JSON.stringify(person)).not.toContain("undefined");
  });
});
