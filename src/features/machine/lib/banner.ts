/**
 * The block-letter banner at the top of /ai, in the "ANSI Shadow" figlet
 * style. Only the letters the banner needs are drawn; any other text gets
 * `null`, and the page prints the name as plain text instead.
 */
const GLYPHS: Record<string, string[]> = {
  A: [" █████╗ ", "██╔══██╗", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  E: ["███████╗", "██╔════╝", "█████╗  ", "██╔══╝  ", "███████╗", "╚══════╝"],
  H: ["██╗  ██╗", "██║  ██║", "███████║", "██╔══██║", "██║  ██║", "╚═╝  ╚═╝"],
  N: ["███╗   ██╗", "████╗  ██║", "██╔██╗ ██║", "██║╚██╗██║", "██║ ╚████║", "╚═╝  ╚═══╝"],
  T: ["████████╗", "╚══██╔══╝", "   ██║   ", "   ██║   ", "   ██║   ", "   ╚═╝   "],
};

export function banner(text: string): string | null {
  const glyphs = [...text.toUpperCase()].map((char) => GLYPHS[char]);
  if (glyphs.length === 0 || glyphs.some((g) => !g)) return null;

  const rows = glyphs[0].map((_, row) => glyphs.map((g) => g[row]).join(""));
  return rows.join("\n");
}

/** One character cell is W × H units; double lines sit D either side of center. */
const W = 6;
const H = 12;
const D = 1.5;

/**
 * The banner as SVG geometry: full blocks become squares and the box-drawing
 * shadow becomes double strokes. Drawn rather than typeset because the mono
 * font has no box-drawing glyphs, and fallback fonts don't keep the columns.
 */
export function bannerShapes(art: string) {
  const rows = art.split("\n");
  const blocks: { x: number; y: number }[] = [];
  const lines: string[] = [];

  rows.forEach((row, r) =>
    [...row].forEach((char, c) => {
      const x = c * W;
      const y = r * H;
      const cx = x + W / 2;
      const cy = y + H / 2;
      const [l, rt, t, b] = [x, x + W, y, y + H];
      const seg = (...pts: [number, number][]) =>
        lines.push(`M${pts.map(([px, py]) => `${px} ${py}`).join("L")}`);

      switch (char) {
        case "█":
          blocks.push({ x, y });
          break;
        case "═":
          seg([l, cy - D], [rt, cy - D]);
          seg([l, cy + D], [rt, cy + D]);
          break;
        case "║":
          seg([cx - D, t], [cx - D, b]);
          seg([cx + D, t], [cx + D, b]);
          break;
        case "╗":
          seg([l, cy - D], [cx + D, cy - D], [cx + D, b]);
          seg([l, cy + D], [cx - D, cy + D], [cx - D, b]);
          break;
        case "╔":
          seg([rt, cy - D], [cx - D, cy - D], [cx - D, b]);
          seg([rt, cy + D], [cx + D, cy + D], [cx + D, b]);
          break;
        case "╝":
          seg([l, cy + D], [cx + D, cy + D], [cx + D, t]);
          seg([l, cy - D], [cx - D, cy - D], [cx - D, t]);
          break;
        case "╚":
          seg([rt, cy + D], [cx - D, cy + D], [cx - D, t]);
          seg([rt, cy - D], [cx + D, cy - D], [cx + D, t]);
          break;
      }
    }),
  );

  return {
    width: Math.max(...rows.map((row) => row.length)) * W,
    height: rows.length * H,
    cell: { w: W, h: H },
    blocks,
    path: lines.join(""),
  };
}
