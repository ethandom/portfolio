import {
  type MeshStandardMaterial,
  type Object3D,
  Quaternion,
  Vector3,
} from "three";
import type { HitId } from "./hits";
import { homeOf, restore, type WorkbenchModel } from "./model";
import { setLit } from "./relay-board";
import { BOOT_LOG, BOOT_SECONDS, type MonitorScreen } from "./screens";
import type { Cue } from "./sfx";
import type { Terminal } from "./terminal";
import { easeInOutQuart, type Tweens } from "./tweens";

/** What an action can reach. Built fresh for each click. */
export type ActionContext = {
  model: WorkbenchModel;
  tweens: Tweens;
  monitor: MonitorScreen;
  /** The monitor's relayctl session; the relay LEDs follow its mask while it's online (bindBoard). */
  terminal: Terminal;
  /** Seconds, or 0 under reduced motion. */
  seconds: (s: number) => number;
  /** An effect `at` seconds into the action (at its start under reduced motion), `level` times as loud. */
  sound: (cue: Cue, at?: number, level?: number) => void;
  /** On/off state that outlives one click (is the relay plugged in?). */
  flags: Set<string>;
  /**
   * Starts a run under `key` and returns a check that stays true until
   * the station resets or another run claims the same key. Check it after
   * every await before going on.
   */
  claim: (key: string) => () => boolean;
};

/**
 * What clicking an object does at its station. The camera stays put.
 * `reset` puts everything back when the camera leaves the station.
 */
export type Action = {
  play: (ctx: ActionContext) => void | Promise<void>;
  reset: (ctx: ActionContext) => void;
};

/**
 * `cue` at each of `times` (seconds into the action), each at its level.
 * Under reduced motion the action jumps to its end, so only the loudest
 * plays: the same sound stacked would just be louder.
 */
function sounds(
  ctx: ActionContext,
  cue: Cue,
  times: readonly number[],
  levels: readonly number[] = times.map(() => 1),
) {
  if (ctx.seconds(1) === 0) {
    return ctx.sound(cue, 0, Math.max(...levels));
  }
  times.forEach((at, i) => ctx.sound(cue, at, levels[i]));
}

const setLed = (
  materials: MeshStandardMaterial | MeshStandardMaterial[],
  on: boolean,
) => {
  for (const material of [materials].flat()) setLit(material, on);
};

/** Spans of 0..1 where the relay LEDs are lit while they come up. */
const FLICKER = [
  [0.08, 0.16],
  [0.3, 0.36],
  [0.47, 0.62],
  [0.74, 1],
];

/**
 * The cable plugs in (the tube follows), the LEDs flicker on, the monitor
 * types the boot log, then the terminal comes online: from there the LEDs
 * show its mask, every channel off to start. Clicking the cable again
 * unplugs, which ends the session.
 */
const plugIn: Action = {
  async play(ctx) {
    if (ctx.flags.has("plugged")) {
      ctx.claim("plug");
      ctx.sound("unplug");
      plugIn.reset(ctx);
      return;
    }
    ctx.flags.add("plugged");
    const live = ctx.claim("plug");
    const { plug, leds } = ctx.model;
    // The plug slides (when it moves at all), then seats as the tween ends.
    if (ctx.seconds(1) > 0) ctx.sound("slide");
    ctx.sound("plug", 0.75);
    await ctx.tweens.run("plug", ctx.seconds(0.8), (t) => {
      const k = easeInOutQuart(t);
      plug.object.position.lerpVectors(plug.home, plug.docked, k);
    });
    if (!live()) return;
    await ctx.tweens.run("relay-leds", ctx.seconds(0.6), (t) => {
      setLed(leds.relay, FLICKER.some(([a, b]) => t >= a && t <= b));
    });
    if (!live()) return;
    ctx.monitor.boot();
    ctx.sound("boot");
    await ctx.tweens.run("boot", ctx.seconds(BOOT_SECONDS), () => {});
    if (!live()) return;
    // The log stays on screen as the session's first rows, a blank row
    // before the prompt.
    ctx.terminal.start([...BOOT_LOG, ""]);
  },
  reset(ctx) {
    ctx.flags.delete("plugged");
    ctx.tweens.stop("plug");
    ctx.tweens.stop("relay-leds");
    ctx.tweens.stop("boot");
    ctx.terminal.reset();
    ctx.model.plug.object.position.copy(ctx.model.plug.home);
    setLed(ctx.model.leds.relay, false);
    ctx.monitor.idle();
  },
};

/**
 * The board and the monitor: plug in if nothing is. Once the terminal is
 * online, a click there focuses it (the app does that) and never unplugs.
 */
const connect: Action = {
  play(ctx) {
    if (!ctx.flags.has("plugged")) return plugIn.play(ctx);
  },
  // plugIn's reset puts everything back.
  reset() {},
};

/** The Pi's activity LED blinks three times. */
const blinkPi: Action = {
  play(ctx) {
    const { pi } = ctx.model.leds;
    // As each blink lights (the LED is on in the odd sixths).
    sounds(ctx, "blip", [0.2, 0.6, 1]);
    void ctx.tweens.run("pi", ctx.seconds(1.2), (t) => {
      setLed(pi, t === 1 || Math.floor(t * 6) % 2 === 1);
    });
  },
  reset(ctx) {
    ctx.tweens.stop("pi");
    setLed(ctx.model.leds.pi, true);
  },
};

const part = (ctx: ActionContext, name: string): Object3D => {
  const object = ctx.model.root.getObjectByName(name);
  if (!object) throw new Error(`scene.glb: no node named ${name}`);
  return object;
};

/** The grille pumps a little, like a level meter catching a word. */
const levelMic: Action = {
  play(ctx) {
    const grille = part(ctx, "Mic_Grille");
    const home = homeOf(grille).scale;
    sounds(ctx, "tap", [0, 0.16], [1, 0.7]);
    void ctx.tweens.run("mic", ctx.seconds(1), (t) => {
      const level = Math.abs(Math.sin(t * Math.PI * 7)) * (1 - t);
      grille.scale.copy(home).multiplyScalar(1 + 0.05 * level);
    });
  },
  reset(ctx) {
    ctx.tweens.stop("mic");
    restore(part(ctx, "Mic_Grille"));
  },
};

const wobble = new Quaternion();
const Z = new Vector3(0, 0, 1);
const Y = new Vector3(0, 1, 0);

/** The mug rocks on its base and settles. */
const rockMug: Action = {
  play(ctx) {
    const mug = ctx.model.hits.get("mug")?.group;
    if (!mug) return;
    const home = homeOf(mug).quaternion;
    // Its base knocks at each end of a rock, softer as it settles.
    sounds(ctx, "clink", [0.09, 0.26, 0.44, 0.61], [1, 0.7, 0.43, 0.15]);
    void ctx.tweens.run("mug", ctx.seconds(0.7), (t) => {
      const angle = 0.12 * Math.sin(t * Math.PI * 4) * (1 - t);
      mug.quaternion.copy(home).multiply(wobble.setFromAxisAngle(Z, angle));
    });
  },
  reset(ctx) {
    ctx.tweens.stop("mug");
    const mug = ctx.model.hits.get("mug")?.group;
    if (mug) restore(mug);
  },
};

/** White's f3 knight hops to g5; the next click brings it back. */
const KNIGHT = ["piece_knight_white_01"];
/**
 * One file toward h, two ranks toward black, in the chess set's space:
 * 5.79 cm squares, the a-file at +x and white's back rank at -z (dress.py).
 */
const KNIGHT_MOVE = new Vector3(-0.0579, 0, 0.1158);

const hopKnight: Action = {
  play(ctx) {
    const out = !ctx.flags.has("knight");
    if (out) ctx.flags.add("knight");
    else ctx.flags.delete("knight");
    const pieces = KNIGHT.map((name) => part(ctx, name));
    const from = pieces.map((p) => p.position.clone());
    // Lifted, then set down.
    sounds(ctx, "tock", [0, 0.6], [0.3, 1]);
    void ctx.tweens.run("chess", ctx.seconds(0.6), (t) => {
      const k = easeInOutQuart(t);
      pieces.forEach((piece, i) => {
        const to = homeOf(piece).position.clone();
        if (out) to.add(KNIGHT_MOVE);
        piece.position.lerpVectors(from[i], to, k);
        piece.position.y += 0.04 * Math.sin(Math.PI * t);
      });
    });
  },
  reset(ctx) {
    ctx.flags.delete("knight");
    ctx.tweens.stop("chess");
    KNIGHT.forEach((name) => restore(part(ctx, name)));
  },
};

/** The disc hops, spins once, and lands where it was. */
const flipDisc: Action = {
  play(ctx) {
    const disc = part(ctx, "Disc");
    const home = homeOf(disc);
    if (ctx.seconds(1) > 0) ctx.sound("whoosh");
    ctx.sound("thud", 1);
    void ctx.tweens.run("frisbee", ctx.seconds(1), (t) => {
      disc.position.copy(home.position);
      disc.position.y += 0.28 * Math.sin(Math.PI * t);
      const spin = 2 * Math.PI * easeInOutQuart(t);
      disc.quaternion
        .copy(home.quaternion)
        .multiply(wobble.setFromAxisAngle(Y, spin));
    });
  },
  reset(ctx) {
    ctx.tweens.stop("frisbee");
    restore(part(ctx, "Disc"));
  },
};

/**
 * The registry: what each object does when clicked at its station.
 * Objects missing here only show their label (or open a panel, panels.ts).
 */
export const ACTIONS: Partial<Record<HitId, Action>> = {
  relay: connect,
  monitor: connect,
  usb: plugIn,
  pi: blinkPi,
  mic: levelMic,
  mug: rockMug,
  chess: hopKnight,
  frisbee: flipDisc,
};

/** Each action once, for resetting a station. */
export const ALL_ACTIONS = [...new Set(Object.values(ACTIONS))];
