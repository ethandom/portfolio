import { describe, expect, it } from "vitest";
import { getExperience, getProfile, getProjects } from "@/lib/content";
import { partRole } from "./stack-mark";

describe("StackMark", () => {
  it("has a mark for every tool a stack or skill list in /content names", () => {
    const names = new Set([
      ...[...getProjects(), ...getExperience()].flatMap((e) => e.stack),
      ...Object.values(getProfile().skills).flat(),
    ]);
    const unmarked = [...names].filter((n) => partRole(n) === "Component");
    expect(unmarked).toEqual([]);
  });
});
