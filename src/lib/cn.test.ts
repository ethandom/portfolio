import { describe, expect, test } from "vitest";
import { cn, tv } from "./cn";

describe("class merging knows the token font sizes", () => {
  test("text-label survives a text color", () => {
    expect(cn("font-mono text-label uppercase", "text-ink-muted")).toBe(
      "font-mono text-label uppercase text-ink-muted",
    );
    expect(cn("text-display", "text-ink")).toBe("text-display text-ink");
  });

  test("a later size still replaces it", () => {
    expect(cn("text-label", "text-sm")).toBe("text-sm");
  });

  test("tv() uses the same rules", () => {
    const label = tv({ base: "text-label", variants: { tone: { ink: "text-ink" } } });
    expect(label({ tone: "ink" })).toBe("text-label text-ink");
  });
});
