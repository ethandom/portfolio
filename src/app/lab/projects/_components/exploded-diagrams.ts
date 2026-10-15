/**
 * Mockup B data: hand-drawn system diagrams, keyed by project slug.
 * `callout` is the 1-based highlight a node is numbered for; `parts` lists the
 * nodes each highlight touches, so hovering a callout lights them.
 */
export type DiagramNode = {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  w: number;
  external?: boolean;
  callout?: number;
};

export type Diagram = {
  viewBox: [number, number];
  nodes: DiagramNode[];
  /** SVG path data, drawn in order. */
  edges: { d: string; arrow?: boolean }[];
  bands?: { label: string; x: number; w: number }[];
  parts: string[][];
  title: string;
};

export const NODE_H = 52;

export const DIAGRAMS: Record<string, Diagram> = {
  conturo: {
    title: "System, exploded",
    viewBox: [660, 356],
    nodes: [
      {
        id: "tools",
        label: "Nonprofit tools",
        sub: "CRM · email · analytics",
        x: 16,
        y: 40,
        w: 172,
        external: true,
      },
      {
        id: "api",
        label: "REST API",
        sub: "Hono · Zod",
        x: 248,
        y: 40,
        w: 172,
        callout: 1,
      },
      {
        id: "mcp",
        label: "MCP server",
        sub: "chat interface",
        x: 476,
        y: 40,
        w: 168,
        callout: 3,
      },
      {
        id: "db",
        label: "PostgreSQL",
        sub: "contacts · jobs",
        x: 248,
        y: 160,
        w: 172,
      },
      {
        id: "worker",
        label: "Export worker",
        sub: "Deno · leases",
        x: 476,
        y: 160,
        w: 168,
        callout: 4,
      },
      {
        id: "enrich",
        label: "Enrichment",
        sub: "cron · Playwright · OpenAI",
        x: 248,
        y: 280,
        w: 172,
        callout: 2,
      },
    ],
    edges: [
      { d: "M188 66 H248", arrow: true },
      { d: "M476 66 H420", arrow: true },
      { d: "M334 92 V160", arrow: true },
      { d: "M420 186 H476", arrow: true },
      // Hops over the enrichment line where they cross, as on a drafted schematic.
      { d: "M560 212 V248 H340 A6 6 0 0 0 328 248 H102 V92", arrow: true },
      { d: "M334 280 V212", arrow: true },
    ],
    parts: [
      ["tools", "api", "db"],
      ["enrich", "db"],
      ["mcp", "api"],
      ["worker", "db", "tools"],
    ],
  },
  "usb-relay-driver": {
    title: "Signal path, exploded",
    viewBox: [660, 236],
    bands: [
      { label: "User space", x: 8, w: 236 },
      { label: "Kernel", x: 252, w: 132 },
      { label: "Hardware", x: 392, w: 260 },
    ],
    nodes: [
      {
        id: "cli",
        label: "relayctl",
        sub: '"set 1 on"',
        x: 16,
        y: 80,
        w: 100,
        callout: 5,
      },
      {
        id: "dev",
        label: "/dev/usbrelayN",
        sub: "1-byte mask",
        x: 136,
        y: 80,
        w: 108,
        callout: 1,
      },
      {
        id: "module",
        label: "Kernel module",
        sub: "probe · disconnect",
        x: 260,
        y: 80,
        w: 116,
        callout: 3,
      },
      {
        id: "ftdi",
        label: "FT232R",
        sub: "bit-bang mode",
        x: 400,
        y: 80,
        w: 104,
        callout: 2,
      },
      {
        id: "boards",
        label: "Relay boards",
        sub: "up to 4",
        x: 524,
        y: 80,
        w: 120,
        callout: 4,
      },
    ],
    edges: [
      { d: "M116 106 H136", arrow: true },
      { d: "M244 106 H260", arrow: true },
      { d: "M376 106 H400", arrow: true },
      { d: "M504 106 H524", arrow: true },
    ],
    parts: [
      ["dev", "module", "ftdi"],
      ["ftdi"],
      ["module"],
      ["boards", "module"],
      ["cli", "dev"],
    ],
  },
};
