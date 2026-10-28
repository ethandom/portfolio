import { describe, expect, it } from "vitest";
import { BELL, CHORDS, PHRASE, planBar, STEP, STEPS, stepTime, SWING } from "./lofi";

const kinds = (bar: number) => new Set(planBar(bar).map((hit) => hit.kind));

describe("planBar", () => {
  it("plays the same bar the same way every time", () => {
    for (const bar of [0, 5, 13, 31]) expect(planBar(bar)).toEqual(planBar(bar));
  });

  it("keeps every hit inside its bar, and every note in a soft range", () => {
    for (let bar = 0; bar < 4 * PHRASE * 2; bar++) {
      for (const hit of planBar(bar)) {
        expect(hit.step).toBeGreaterThanOrEqual(0);
        expect(hit.step).toBeLessThan(STEPS);
        expect(hit.vel).toBeGreaterThan(0);
        expect(hit.vel).toBeLessThanOrEqual(1);
        if (hit.kind === "keys") {
          expect(hit.step + hit.steps).toBeLessThanOrEqual(STEPS);
          for (const note of hit.notes) expect(note).toBeGreaterThanOrEqual(52);
        }
        if (hit.kind === "bass") expect(hit.note).toBeLessThanOrEqual(55);
        if (hit.kind === "bell") expect(BELL).toContain(hit.note);
      }
    }
  });

  it("opens on the keys alone, then the band comes in", () => {
    expect(kinds(0)).toEqual(new Set(["keys"]));
    expect(kinds(1)).toEqual(new Set(["keys"]));
    expect(kinds(2)).toEqual(new Set(["keys", "bass", "hat", "kick", "snare"]));
  });

  it("follows the chords, with the bell every other phrase and a breath every fourth", () => {
    planBar(PHRASE + 3)
      .filter((hit) => hit.kind === "keys")
      .forEach((hit) => expect(CHORDS[3].keys).toEqual(expect.arrayContaining([...hit.notes])));
    for (let bar = PHRASE; bar < 2 * PHRASE; bar++) expect(kinds(bar)).toContain("bell");
    for (let bar = 2 * PHRASE; bar < 3 * PHRASE; bar++) expect(kinds(bar)).not.toContain("bell");
    const breath = kinds(4 * PHRASE - 1);
    expect(breath).not.toContain("kick");
    expect(breath).not.toContain("snare");
    expect(kinds(4 * PHRASE)).toContain("kick");
  });
});

describe("stepTime", () => {
  it("swings every second 16th late", () => {
    expect(stepTime(1, 0, 0)).toBe(1);
    expect(stepTime(1, 0, 1)).toBeCloseTo(1 + (1 + SWING) * STEP, 9);
    expect(stepTime(1, 2, 4)).toBeCloseTo(1 + (2 * STEPS + 4) * STEP, 9);
  });
});
