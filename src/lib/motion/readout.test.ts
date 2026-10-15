import { describe, expect, it } from "vitest";
import { parseReadout } from "./readout";

describe("parseReadout", () => {
  it.each([
    ["100k+", { prefix: "", target: 100, suffix: "k+", decimals: 0, grouped: false }],
    ["1M+", { prefix: "", target: 1, suffix: "M+", decimals: 0, grouped: false }],
    ["256", { prefix: "", target: 256, suffix: "", decimals: 0, grouped: false }],
    ["~1,250.5 ms", { prefix: "~", target: 1250.5, suffix: " ms", decimals: 1, grouped: true }],
  ])("%s", (value, expected) => {
    expect(parseReadout(value)).toEqual(expected);
  });

  it("returns null without a number", () => {
    expect(parseReadout("Present")).toBeNull();
  });
});
