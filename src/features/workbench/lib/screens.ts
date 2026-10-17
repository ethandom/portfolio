import { CanvasTexture, MeshBasicMaterial, SRGBColorSpace } from "three";
import type { ScreenQuad } from "./model";
import { type Ink, layout, type Terminal, wrap } from "./terminal";

/** Canvas pixels per meter of screen. */
const PX_PER_M = 1700;

/** Night Shift tokens, read off the page so the screens match the site. */
export type Palette = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  accentText: string;
  /** relayctl's OK and ERR lines, as on the Manual's relay figure. */
  ok: string;
  err: string;
  font: string;
};

export function readPalette(element: Element): Palette {
  const style = getComputedStyle(element);
  const token = (name: string, fallback: string) =>
    style.getPropertyValue(name).trim() || fallback;
  return {
    bg: token("--bg", "#161514"),
    ink: token("--ink", "#e8e1d4"),
    muted: token("--ink-muted", "#9a9488"),
    accent: token("--accent", "#ff4f00"),
    accentText: token("--accent-text", "#ff6a2b"),
    ok: token("--live-text", "#3ddc84"),
    err: token("--error", "#ff6b5e"),
    font: `${token("--font-mono-loaded", "")}, ui-monospace, monospace`,
  };
}

/**
 * A CanvasTexture on a screen quad, repainted at a capped frame rate. It
 * replaces the quad's material, so it sits in the scene like any surface
 * (other objects occlude it). glTF UVs put v = 0 at the top, so no flip.
 */
abstract class CanvasScreen {
  protected readonly g: CanvasRenderingContext2D;
  protected readonly w: number;
  protected readonly h: number;
  readonly texture: CanvasTexture;
  private readonly material: MeshBasicMaterial;
  private last = -Infinity;

  constructor(
    quad: ScreenQuad,
    protected palette: Palette,
    private fps: number,
  ) {
    const canvas = document.createElement("canvas");
    this.w = canvas.width = Math.round(quad.width * PX_PER_M);
    this.h = canvas.height = Math.round(quad.height * PX_PER_M);
    const g = canvas.getContext("2d");
    if (!g) throw new Error("No 2D canvas context");
    this.g = g;
    this.texture = new CanvasTexture(canvas);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.flipY = false;
    this.material = new MeshBasicMaterial({
      map: this.texture,
      toneMapped: false,
    });
    quad.mesh.material = this.material;
  }

  get painted() {
    return this.last > -Infinity;
  }

  /** `now` in seconds. */
  tick(now: number, reduced: boolean) {
    if (now - this.last < 1 / this.fps) return;
    this.repaint(now, reduced);
  }

  /** Paints now, whatever the frame rate. */
  protected repaint(now: number, reduced: boolean) {
    this.last = now;
    this.paint(now, reduced);
    this.texture.needsUpdate = true;
  }

  protected abstract paint(now: number, reduced: boolean): void;

  protected font(px: number, weight = 400) {
    this.g.font = `${weight} ${px}px ${this.palette.font}`;
    this.g.textBaseline = "top";
  }

  dispose() {
    this.texture.dispose();
    this.material.dispose();
  }
}

/** Deterministic noise in [0, 1). */
const hash = (n: number) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const hex = (n: number, digits: number) =>
  Math.floor(n).toString(16).padStart(digits, "0").slice(-digits);

/**
 * Kernel log for the relay board coming up. Illustrative; check with dmesg.
 * The terminal's session opens with it (and a blank row) as scrollback.
 */
export const BOOT_LOG = [
  "usb 1-1: new full-speed USB device number 4 using xhci_hcd",
  "usb 1-1: Product: FT232R USB UART",
  "ftdi_sio 1-1:1.0: FTDI USB Serial Device converter detected",
  "usbrelay: 8 channels ready on /dev/usbrelay0",
];
/** Seconds between boot lines, and characters typed per second. */
const LINE_GAP = 0.45;
const TYPE_RATE = 70;
/** Characters per row once booted: big enough to read from the stool. */
const COLUMNS = 46;
/** Text wraps a little inside that, clear of the bezel. */
const WRAP = COLUMNS - 2;
/** The site's caret blink (motion.css), in seconds. */
const BLINK = 1.06;

/** How long the boot log takes to type out after boot(), plus a beat before the prompt. */
export const BOOT_SECONDS =
  Math.max(
    ...BOOT_LOG.map(
      (text, i) => i * LINE_GAP + wrap(text, WRAP).join("").length / TYPE_RATE,
    ),
  ) + 0.3;

type Caret = "on" | "off" | "hollow";

/**
 * The bench monitor. Idle: a dim hex dump scrolling past and an orange
 * status bar. Booted: the kernel log types out. Once the terminal is
 * online: the relayctl session, scrolled to its prompt, repainted only when
 * the session changes or the caret blinks.
 */
export class MonitorScreen extends CanvasScreen {
  private bootedAt: number | null = null;
  private clock = 0;
  /** The terminal frame on screen, as `version:caret`. */
  private shown = "";
  private seen = -1;
  /** When the session last changed: the caret stays solid while typing. */
  private editedAt = 0;
  private caret: Caret = "hollow";

  constructor(
    quad: ScreenQuad,
    palette: Palette,
    private terminal: Terminal,
  ) {
    super(quad, palette, 15);
  }

  boot() {
    this.bootedAt = this.clock;
  }

  idle() {
    this.bootedAt = null;
  }

  override tick(now: number, reduced: boolean) {
    this.clock = now;
    const t = this.terminal;
    if (!t.online) {
      this.shown = "";
      super.tick(now, reduced);
      return;
    }
    if (t.version !== this.seen) {
      this.seen = t.version;
      this.editedAt = now;
    }
    this.caret = !t.focused
      ? "hollow"
      : reduced || (now - this.editedAt) % BLINK < BLINK / 2
        ? "on"
        : "off";
    const frame = `${t.version}:${this.caret}`;
    if (frame === this.shown) return;
    this.shown = frame;
    this.repaint(now, reduced);
  }

  protected paint(now: number, reduced: boolean) {
    const { g, w, h, palette } = this;
    g.fillStyle = palette.bg;
    g.fillRect(0, 0, w, h);
    if (this.terminal.online) this.paintTerminal();
    else if (this.bootedAt === null) this.paintIdle(now, reduced);
    else this.paintBoot(reduced ? Infinity : now - this.bootedAt);
  }

  /** The booted type grid: COLUMNS characters a row. */
  private grid() {
    const { g, w } = this;
    const size = w / (COLUMNS * 0.62);
    this.font(size);
    const pad = size * 0.8;
    const cell = g.measureText("0").width;
    return {
      size,
      line: size * 1.4,
      pad,
      cell,
      x: (column: number) => pad + column * cell,
    };
  }

  private paintIdle(now: number, reduced: boolean) {
    const { g, w, h, palette } = this;
    const size = Math.round(h / 26);
    const line = size * 1.5;
    const pad = size * 1.6;
    const bar = size * 2.6;

    // Hex dump drifting upward, one line a second.
    const scroll = reduced ? 0 : now;
    const first = Math.floor(scroll);
    const offset = (scroll - first) * line;
    this.font(size);
    g.save();
    g.beginPath();
    g.rect(0, 0, w, h - bar);
    g.clip();
    g.globalAlpha = 0.32;
    g.fillStyle = palette.muted;
    for (let i = 0; pad + i * line - offset < h - bar; i++) {
      const n = first + i;
      const bytes = Array.from({ length: 8 }, (_, b) =>
        hex(hash(n * 8 + b) * 256, 2),
      ).join(" ");
      g.fillText(`${hex(n * 16, 6)}  ${bytes}`, pad, pad + i * line - offset);
    }
    g.restore();

    g.fillStyle = palette.accent;
    g.fillRect(0, h - bar, w, bar);
    const label = size * 1.4;
    this.font(label, 500);
    g.fillStyle = palette.bg;
    g.fillText(
      "IDLE — PLUG IN THE RELAY BOARD",
      pad,
      h - bar + (bar - label) / 2,
    );
  }

  /** The kernel log typing out; the terminal takes over once it's online. */
  private paintBoot(elapsed: number) {
    const { g, palette } = this;
    const { pad, line, x } = this.grid();
    let y = pad;
    g.fillStyle = palette.ink;
    BOOT_LOG.forEach((text, i) => {
      const start = i * LINE_GAP;
      if (elapsed < start) return;
      let chars = Math.floor((elapsed - start) * TYPE_RATE);
      for (const row of wrap(text, WRAP)) {
        if (chars <= 0) break;
        g.fillText(row.slice(0, chars), x(0), y);
        chars -= row.length;
        y += line;
      }
    });
  }

  /**
   * The session, laid out on the boot log's grid (so the log doesn't move
   * when the shell takes over) and scrolled to the prompt. The caret is a
   * block over its character while the terminal has focus, hollow while it
   * doesn't.
   */
  private paintTerminal() {
    const { g, h, palette } = this;
    const { size, line, pad, cell, x } = this.grid();
    const ink: Record<Ink, string> = {
      out: palette.ink,
      ok: palette.ok,
      err: palette.err,
      dim: palette.muted,
      prompt: palette.accentText,
    };
    const screen = layout(this.terminal, WRAP);
    const fit = Math.max(1, Math.floor((h - 2 * pad - size) / line) + 1);
    const first = Math.max(0, screen.lines.length - fit);
    screen.lines.slice(first).forEach((spans, i) => {
      let column = 0;
      for (const span of spans) {
        g.fillStyle = ink[span.ink];
        g.fillText(span.text, x(column), pad + i * line);
        column += span.text.length;
      }
    });

    const { column, char } = screen.caret;
    const y = pad + (screen.caret.line - first) * line;
    const [top, height] = [y - size * 0.1, size * 1.2];
    if (this.caret === "on") {
      g.fillStyle = palette.accent;
      g.fillRect(x(column), top, cell, height);
      g.fillStyle = palette.bg;
      g.fillText(char, x(column), y);
    } else if (this.caret === "hollow") {
      const stroke = Math.max(2, size * 0.07);
      g.strokeStyle = palette.accent;
      g.lineWidth = stroke;
      g.strokeRect(
        x(column) + stroke / 2,
        top + stroke / 2,
        cell - stroke,
        height - stroke,
      );
    }
  }
}

/** Fibonacci sphere, unit radius. */
const COUNT = 260;
const POINTS = Array.from({ length: COUNT }, (_, i) => {
  const y = 1 - (2 * (i + 0.5)) / COUNT;
  const r = Math.sqrt(1 - y * y);
  const a = i * Math.PI * (3 - Math.sqrt(5));
  return [Math.cos(a) * r, y, Math.sin(a) * r] as const;
});

/**
 * The laptop: a point cloud turning slowly over an orange waveform. Only
 * repainted while the camera is at the workbench.
 */
export class LaptopScreen extends CanvasScreen {
  constructor(quad: ScreenQuad, palette: Palette) {
    super(quad, palette, 30);
  }

  protected paint(now: number, reduced: boolean) {
    const { g, w, h, palette } = this;
    const t = reduced ? 0 : now;
    g.fillStyle = palette.bg;
    g.fillRect(0, 0, w, h);

    // Point cloud: spin about Y, tilt about X, small perspective.
    const [cx, cy, radius] = [w / 2, h * 0.42, h * 0.3];
    const [spin, tilt] = [t * 0.35, 0.45];
    for (const [x0, y0, z0] of POINTS) {
      const x1 = x0 * Math.cos(spin) + z0 * Math.sin(spin);
      const z1 = -x0 * Math.sin(spin) + z0 * Math.cos(spin);
      const y2 = y0 * Math.cos(tilt) - z1 * Math.sin(tilt);
      const z2 = y0 * Math.sin(tilt) + z1 * Math.cos(tilt);
      const scale = 1 / (1.9 - z2 * 0.6);
      const size = Math.max(1.5, 3.2 * scale);
      // The equator band reads orange; the rest is ink, dimmer at the back.
      g.fillStyle = Math.abs(y0) < 0.08 ? palette.accent : palette.ink;
      g.globalAlpha = 0.25 + 0.75 * ((z2 + 1) / 2);
      g.fillRect(
        cx + x1 * radius * scale * 1.9 - size / 2,
        cy - y2 * radius * scale * 1.9 - size / 2,
        size,
        size,
      );
    }
    g.globalAlpha = 1;

    // Waveform along the bottom.
    const base = h * 0.85;
    g.strokeStyle = palette.accent;
    g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const u = x / w;
      const env = Math.sin(Math.PI * u);
      const y =
        base -
        env *
          h *
          0.06 *
          (Math.sin(u * 22 - t * 3) * 0.7 + Math.sin(u * 57 + t * 5) * 0.3);
      if (x === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  }
}

/** The scope's glass and graticule, under the site palette's traces. */
const SCOPE_BG = "#060b09";
const SCOPE_GRID = "rgba(154, 148, 136, 0.3)";
const SCOPE_RUN = "#3fe0a0";

/**
 * The oscilloscope: a dotted graticule, CH1 (orange) on a sine and CH2
 * (ink) on a square wave, like a relay channel being clocked, both drifting,
 * with the settings along the top. Illustrative, not a measurement. Only
 * repainted while the camera is at the workbench.
 */
export class ScopeScreen extends CanvasScreen {
  constructor(quad: ScreenQuad, palette: Palette) {
    super(quad, palette, 24);
  }

  protected paint(now: number, reduced: boolean) {
    const { g, w, h, palette } = this;
    const t = reduced ? 0 : now;
    g.fillStyle = SCOPE_BG;
    g.fillRect(0, 0, w, h);

    const bar = Math.round(h * 0.13);
    const [top, bottom] = [bar, h - bar * 0.4];
    const dx = w / 10;
    const dy = (bottom - top) / 8;
    const mid = (top + bottom) / 2;

    // Graticule: dotted division lines, 5 dots a division.
    g.fillStyle = SCOPE_GRID;
    for (let i = 0; i <= 10; i++) {
      for (let j = 0; j <= 40; j++)
        g.fillRect(i * dx, top + (j * dy) / 5, 1, 1);
    }
    for (let j = 0; j <= 8; j++) {
      for (let i = 0; i <= 50; i++)
        g.fillRect((i * dx) / 5, top + j * dy, 1, 1);
    }

    const trace = (color: string, y: (u: number) => number) => {
      g.strokeStyle = color;
      g.lineWidth = Math.max(1.5, h / 100);
      g.beginPath();
      for (let x = 0; x <= w; x += 2) {
        if (x === 0) g.moveTo(x, y(0));
        else g.lineTo(x, y(x / w));
      }
      g.stroke();
    };
    trace(
      palette.accent,
      (u) => mid - dy * 1.5 + dy * 1.3 * Math.sin(u * 6 * Math.PI - t * 3),
    );
    trace(palette.ink, (u) => {
      const high = Math.sin(u * 4 * Math.PI - t * 1.5) > 0;
      return mid + dy * 2.2 - (high ? dy : -dy) * 0.9;
    });

    // Settings line.
    const size = bar * 0.62;
    this.font(size, 500);
    const y = (bar - size) / 2;
    const pad = size * 0.5;
    g.fillStyle = palette.accent;
    g.fillText("CH1 1.00V", pad, y);
    g.fillStyle = palette.ink;
    g.fillText("CH2 2.00V", w * 0.3, y);
    g.fillStyle = palette.muted;
    g.fillText("H 500µs", w * 0.6, y);
    g.fillStyle = SCOPE_RUN;
    g.fillText("RUN", w - pad - g.measureText("RUN").width, y);
  }
}
