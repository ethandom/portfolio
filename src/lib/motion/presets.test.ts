import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { duration, ease, stagger } from "./presets";

const tokens = fs.readFileSync(
  path.resolve(__dirname, "../../styles/tokens.css"),
  "utf8",
);

function token(name: string) {
  const match = tokens.match(new RegExp(`--${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`--${name} not found in tokens.css`);
  return match[1].trim();
}

describe("motion presets mirror tokens.css", () => {
  it.each(Object.entries(duration))("--dur-%s", (name, ms) => {
    expect(token(`dur-${name}`)).toBe(`${ms}ms`);
  });

  it.each([
    ["ease-out", ease.out],
    ["ease-in-out", ease.inOut],
    ["ease-snap", ease.snap],
  ])("--%s", (name, value) => {
    expect(token(name)).toBe(value);
  });
});

describe("stagger", () => {
  it("caps the total delay", () => {
    expect(stagger(0)).toBe(0);
    expect(stagger(2)).toBe(120);
    expect(stagger(40)).toBe(360);
  });
});
