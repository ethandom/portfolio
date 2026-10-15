import { describe, expect, it } from "vitest";
import { initials } from "./initials";

describe("initials", () => {
  it("takes the first and last name, counting a hyphenated surname once", () => {
    expect(initials("Ethan Austin-Cruse")).toBe("EA");
  });

  it("skips middle names and extra spaces", () => {
    expect(initials("  ada  king lovelace ")).toBe("AL");
  });

  it("handles a single name", () => {
    expect(initials("Prince")).toBe("P");
  });
});
