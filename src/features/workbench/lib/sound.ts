import { createMix, LEVELS, type Mix } from "./audio";
import { Lofi } from "./lofi";
import { type Cue, CUES } from "./sfx";

/** localStorage: "off" once the visitor has muted (any other value, or none, is on). */
const STORAGE_KEY = "workbench:sound";
/** Seconds ahead of the clock the music books its bars. */
const LOOKAHEAD = 0.4;
/** Milliseconds between bookings. */
const TICK = 150;
/** Seconds the music takes to come in. */
const FADE_IN = 4;
/** Seconds the sound takes to go on mute or on leaving. */
const FADE_OUT = 0.15;
/** A cue never repeats closer than this (s): hover ticks while the pointer sweeps, keys on autorepeat. */
const MIN_GAP: Partial<Record<Cue, number>> = { hover: 0.06, key: 0.02 };

/**
 * muted: the visitor turned it off. waiting: on, but nothing is playing
 * yet (the browser waits for a click or key on the page; or the tab is
 * hidden). playing: the music is running.
 */
export type SoundState = "muted" | "waiting" | "playing";

/** The sound key carries this attribute: a press there is its own decision, not a start. */
export const SOUND_KEY = "data-sound-key";

function storedMute() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "off";
  } catch {
    return false;
  }
}

function storeMute(muted: boolean) {
  try {
    if (muted) localStorage.setItem(STORAGE_KEY, "off");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private windows and blocked storage: it just isn't remembered.
  }
}

/**
 * The Workbench's sound: the lofi loop (lofi.ts) and the effects
 * (sfx.ts), on unless the visitor muted it, which this browser remembers.
 * Browsers play nothing before a click or key on the page, so it starts
 * with the first one, or right away when there was one already (coming
 * over from the Manual by its switch). One AudioContext while attached,
 * suspended while muted or the tab is hidden, closed on detach (leaving
 * the route, or Next's Activity hiding it), so it never plays over the
 * Manual.
 */
export class Sound {
  #muted = storedMute();
  #state: SoundState = this.#muted ? "muted" : "waiting";
  #attached = false;
  #ctx: AudioContext | null = null;
  #mix: Mix | null = null;
  #booking: ReturnType<typeof setInterval> | undefined;
  #suspending: ReturnType<typeof setTimeout> | undefined;
  #last = new Map<Cue, number>();
  #listeners = new Set<() => void>();

  get state() {
    return this.#state;
  }

  /** Stable, so React's useSyncExternalStore can take it as is. */
  subscribe = (listener: () => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** The room is on screen: sound starts now if the page may play it, or at the first click or key. */
  attach() {
    if (this.#attached) return;
    this.#attached = true;
    window.addEventListener("pointerdown", this.#onGesture, true);
    window.addEventListener("keydown", this.#onGesture, true);
    document.addEventListener("visibilitychange", this.#onVisibility);
    this.#start();
  }

  /** The room is gone (or hidden): fade out and let the context go. */
  detach() {
    if (!this.#attached) return;
    this.#attached = false;
    window.removeEventListener("pointerdown", this.#onGesture, true);
    window.removeEventListener("keydown", this.#onGesture, true);
    document.removeEventListener("visibilitychange", this.#onVisibility);
    this.#close();
  }

  /** The sound key: starts sound that's waiting on the browser, or mutes and unmutes. */
  toggle() {
    if (this.#state === "waiting") this.#start();
    else this.setMuted(!this.#muted);
  }

  setMuted(muted: boolean) {
    if (muted === this.#muted) return;
    this.#muted = muted;
    storeMute(muted);
    if (muted) this.#silence();
    else this.#start();
    this.#update();
  }

  /** An effect, `delay` seconds from now, `level` times its designed loudness. */
  play(cue: Cue, delay = 0, level = 1) {
    const ctx = this.#ctx;
    const mix = this.#mix;
    if (!ctx || !mix || this.#muted) return;
    const now = ctx.currentTime;
    const gap = MIN_GAP[cue];
    if (gap !== undefined && now - (this.#last.get(cue) ?? -Infinity) < gap) return;
    this.#last.set(cue, now);
    CUES[cue]({ ctx, out: mix.sfx, at: now + 0.005 + delay, level });
  }

  #onGesture = (e: Event) => {
    if (e.target instanceof Element && e.target.closest(`[${SOUND_KEY}]`)) return;
    if (this.#ctx?.state !== "running") this.#start();
  };

  #onVisibility = () => {
    if (!document.hidden) return this.#start();
    clearTimeout(this.#suspending);
    void this.#ctx?.suspend().catch(() => {});
  };

  #start() {
    if (this.#muted || !this.#attached || document.hidden) return;
    // Before any click or key the browser would refuse it (and say so in the console).
    if (!(navigator.userActivation?.hasBeenActive ?? true)) return;
    clearTimeout(this.#suspending);
    if (!this.#ctx || !this.#mix) this.#open();
    else this.#mix.master.gain.setTargetAtTime(1, this.#ctx.currentTime, 0.05);
    const ctx = this.#ctx;
    if (ctx && ctx.state !== "running") void ctx.resume().catch(() => {});
  }

  #open() {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    ctx.onstatechange = () => this.#update();
    const mix = createMix(ctx, ctx.destination);
    const start = ctx.currentTime + 0.1;
    mix.music.gain.setValueAtTime(0, start);
    mix.music.gain.linearRampToValueAtTime(LEVELS.music, start + FADE_IN);
    const music = new Lofi(ctx, mix.music, mix.room, start);
    const book = () => music.schedule(ctx.currentTime + LOOKAHEAD);
    book();
    this.#booking = setInterval(book, TICK);
    this.#ctx = ctx;
    this.#mix = mix;
  }

  #silence() {
    const ctx = this.#ctx;
    if (!ctx || !this.#mix) return;
    this.#mix.master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT / 3);
    clearTimeout(this.#suspending);
    this.#suspending = setTimeout(() => {
      if (this.#muted) void ctx.suspend().catch(() => {});
    }, FADE_OUT * 1000 + 100);
  }

  #close() {
    clearInterval(this.#booking);
    clearTimeout(this.#suspending);
    const ctx = this.#ctx;
    const mix = this.#mix;
    this.#ctx = null;
    this.#mix = null;
    this.#last.clear();
    if (ctx && mix) {
      ctx.onstatechange = null;
      // The music goes with the context, after the fade.
      mix.master.gain.setTargetAtTime(0, ctx.currentTime, FADE_OUT / 3);
      setTimeout(() => void ctx.close().catch(() => {}), FADE_OUT * 1000 + 100);
    }
    this.#update();
  }

  #update() {
    const next: SoundState = this.#muted
      ? "muted"
      : this.#ctx?.state === "running"
        ? "playing"
        : "waiting";
    if (next === this.#state) return;
    this.#state = next;
    for (const listener of this.#listeners) listener();
  }
}
