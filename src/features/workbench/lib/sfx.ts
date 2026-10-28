import { burst, noiseBuffer, tone } from "./audio";

/**
 * The Workbench's sound effects, each a few oscillators and filtered noise
 * (lib/audio.ts). Soft on purpose: ticks and clicks under the music, never
 * over it. Peaks here are before the effects bus (LEVELS.sfx).
 */
export const CUE_IDS = [
  "hover",
  "travel",
  "return",
  "open",
  "close",
  "slide",
  "plug",
  "unplug",
  "boot",
  "ready",
  "key",
  "enter",
  "error",
  "relay-on",
  "relay-off",
  "blip",
  "tap",
  "clink",
  "tock",
  "whoosh",
  "thud",
] as const;

export type Cue = (typeof CUE_IDS)[number];

/** Where and when a cue plays; `level` scales it (1 = as designed). */
export type Voice = {
  ctx: BaseAudioContext;
  out: AudioNode;
  at: number;
  level: number;
};

/** `n` varied by up to ±`by` (a fraction), so repeats don't sound stamped. */
const vary = (n: number, by: number) => n * (1 + (Math.random() * 2 - 1) * by);

/**
 * Air moving with the camera: noise through a band that sweeps `from` →
 * `to`, swelling then settling over `seconds`. `flutter` (Hz) chops it,
 * like something spinning.
 */
function air(
  { ctx, out, at, level }: Voice,
  from: number,
  to: number,
  seconds: number,
  peak: number,
  flutter = 0,
) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 1.2;
  band.frequency.setValueAtTime(from, at);
  band.frequency.exponentialRampToValueAtTime(to, at + seconds);
  const amp = ctx.createGain();
  const curve = new Float32Array(64);
  for (let i = 0; i < curve.length; i++) {
    const t = i / (curve.length - 1);
    const swell = Math.sin(Math.PI * t) ** 1.5;
    const chop = flutter ? 0.65 + 0.35 * Math.sin(2 * Math.PI * flutter * t * seconds) : 1;
    curve[i] = peak * level * swell * chop;
  }
  amp.gain.setValueCurveAtTime(curve, at, seconds);
  src.connect(band).connect(amp).connect(out);
  src.start(at, Math.random());
  src.stop(at + seconds + 0.02);
}

/** A small mechanical click: a crisp tick of noise and a short body. */
function click({ ctx, out, at, level }: Voice, freq: number, peak: number) {
  burst(ctx, out, { at, filter: "bandpass", freq, q: 2.5, peak: peak * level, decay: 0.0025 });
  tone(ctx, out, { at, freq: freq * 0.3, peak: 0.35 * peak * level, decay: 0.006 });
}

const later = (v: Voice, seconds: number): Voice => ({ ...v, at: v.at + seconds });

export const CUES: Record<Cue, (v: Voice) => void> = {
  /** The pointer finds something to click. */
  hover: (v) =>
    tone(v.ctx, v.out, {
      at: v.at,
      freq: vary(1480, 0.02),
      type: "triangle",
      peak: 0.035 * v.level,
      decay: 0.012,
    }),

  /** The camera glides to a station (scene.tsx's CAMERA_MOVE), and back out. */
  travel: (v) => air(v, 260, 1100, 1.2, 0.14),
  return: (v) => air(v, 900, 240, 1.2, 0.14),

  /** A panel slides in: a paper swish, two pips rising. */
  open: (v) => {
    const { ctx, out, at, level } = v;
    burst(ctx, out, {
      at,
      filter: "bandpass",
      freq: 2400,
      to: 4200,
      glide: 0.12,
      q: 0.8,
      peak: 0.03 * level,
      attack: 0.02,
      decay: 0.04,
    });
    tone(ctx, out, { at, freq: 880, peak: 0.05 * level, decay: 0.06 });
    tone(ctx, out, { at: at + 0.07, freq: 1318.5, peak: 0.045 * level, decay: 0.08 });
  },
  /** …and out: the swish falling, the pips falling. */
  close: (v) => {
    const { ctx, out, at, level } = v;
    burst(ctx, out, {
      at,
      filter: "bandpass",
      freq: 3800,
      to: 2000,
      glide: 0.1,
      q: 0.8,
      peak: 0.025 * level,
      attack: 0.015,
      decay: 0.035,
    });
    tone(ctx, out, { at, freq: 1318.5, peak: 0.04 * level, decay: 0.05 });
    tone(ctx, out, { at: at + 0.06, freq: 880, peak: 0.04 * level, decay: 0.07 });
  },

  /** The USB plug sliding toward the socket (the plug-in action's first 0.8 s). */
  slide: (v) =>
    burst(v.ctx, v.out, {
      at: v.at,
      filter: "bandpass",
      freq: 1400,
      to: 2400,
      glide: 0.7,
      q: 1.5,
      peak: 0.05 * v.level,
      attack: 0.55,
      decay: 0.06,
    }),
  /** …and seating: a plastic click with a second, smaller one. */
  plug: (v) => {
    click(v, 3200, 0.2);
    tone(v.ctx, v.out, { at: v.at, freq: 520, peak: 0.06 * v.level, decay: 0.02 });
    click(later(v, 0.012), 2600, 0.07);
  },
  unplug: (v) => {
    click(v, 2600, 0.16);
    tone(v.ctx, v.out, { at: v.at, freq: 440, peak: 0.05 * v.level, decay: 0.02 });
    burst(v.ctx, v.out, {
      at: v.at + 0.02,
      filter: "bandpass",
      freq: 2200,
      to: 1300,
      glide: 0.2,
      q: 1.5,
      peak: 0.018 * v.level,
      attack: 0.06,
      decay: 0.05,
    });
  },

  /** The board powers up: a soft thump and one POST beep. */
  boot: (v) => {
    tone(v.ctx, v.out, { at: v.at, freq: 72, peak: 0.08 * v.level, decay: 0.05 });
    tone(v.ctx, v.out, {
      at: v.at + 0.12,
      freq: 988,
      peak: 0.04 * v.level,
      attack: 0.005,
      decay: 0.07,
    });
  },
  /** The relayctl prompt is up. */
  ready: (v) => {
    tone(v.ctx, v.out, { at: v.at, freq: 1046.5, peak: 0.035 * v.level, decay: 0.25 });
    tone(v.ctx, v.out, { at: v.at + 0.09, freq: 1568, peak: 0.03 * v.level, decay: 0.3 });
  },

  /** A keystroke on the terminal: a tick and a little thock, never twice the same. */
  key: (v) => {
    burst(v.ctx, v.out, {
      at: v.at,
      filter: "bandpass",
      freq: vary(3000, 0.15),
      q: 1.2,
      peak: vary(0.09, 0.2) * v.level,
      decay: 0.004,
    });
    tone(v.ctx, v.out, { at: v.at, freq: vary(190, 0.1), peak: 0.05 * v.level, decay: 0.008 });
  },
  /** Enter: a bigger key. */
  enter: (v) => {
    burst(v.ctx, v.out, {
      at: v.at,
      filter: "bandpass",
      freq: 2000,
      q: 1,
      peak: 0.11 * v.level,
      decay: 0.006,
    });
    tone(v.ctx, v.out, { at: v.at, freq: 150, peak: 0.07 * v.level, decay: 0.012 });
  },
  /** relayctl printed an error: two low pips, falling. */
  error: (v) => {
    tone(v.ctx, v.out, { at: v.at, type: "triangle", freq: 233, peak: 0.05 * v.level, decay: 0.05 });
    tone(v.ctx, v.out, {
      at: v.at + 0.1,
      type: "triangle",
      freq: 196,
      peak: 0.05 * v.level,
      decay: 0.07,
    });
  },

  /** A relay channel pulls in: the armature's click and a bounce. */
  "relay-on": (v) => {
    click(v, vary(3000, 0.05), 0.3);
    click(later(v, 0.006), vary(3600, 0.05), 0.11);
  },
  /** …and lets go, a little lower. */
  "relay-off": (v) => {
    click(v, vary(2300, 0.05), 0.22);
    click(later(v, 0.005), vary(2800, 0.05), 0.07);
  },

  /** The Pi's activity LED. */
  blip: (v) =>
    tone(v.ctx, v.out, { at: v.at, freq: 2637, peak: 0.04 * v.level, decay: 0.015 }),
  /** A finger on the mic grille. */
  tap: (v) => {
    burst(v.ctx, v.out, {
      at: v.at,
      filter: "lowpass",
      freq: 500,
      q: 0.7,
      peak: 0.18 * v.level,
      decay: 0.02,
    });
    tone(v.ctx, v.out, { at: v.at, freq: 95, peak: 0.1 * v.level, decay: 0.04 });
  },
  /** The mug's base knocking the desk as it rocks. */
  clink: (v) => {
    tone(v.ctx, v.out, { at: v.at, freq: vary(1850, 0.03), peak: 0.06 * v.level, decay: 0.02 });
    tone(v.ctx, v.out, { at: v.at, freq: vary(3100, 0.03), peak: 0.03 * v.level, decay: 0.012 });
    burst(v.ctx, v.out, {
      at: v.at,
      filter: "highpass",
      freq: 3000,
      peak: 0.03 * v.level,
      decay: 0.002,
    });
  },
  /** A chess piece set down on the board. */
  tock: (v) => {
    tone(v.ctx, v.out, { at: v.at, freq: 720, peak: 0.09 * v.level, decay: 0.018 });
    tone(v.ctx, v.out, { at: v.at, freq: 1260, peak: 0.04 * v.level, decay: 0.01 });
    burst(v.ctx, v.out, {
      at: v.at,
      filter: "bandpass",
      freq: 1800,
      peak: 0.06 * v.level,
      decay: 0.004,
    });
  },
  /** The disc spinning up and over (the flip's one second). */
  whoosh: (v) => air(v, 700, 1400, 1, 0.12, 9),
  /** …and landing on the couch. */
  thud: (v) => {
    burst(v.ctx, v.out, {
      at: v.at,
      filter: "lowpass",
      freq: 400,
      peak: 0.16 * v.level,
      decay: 0.03,
    });
    tone(v.ctx, v.out, { at: v.at, freq: 85, peak: 0.09 * v.level, decay: 0.05 });
  },
};
