import { burst, hz, pluck, tone } from "./audio";

/**
 * The Workbench's music: a soft lofi loop played live by Web Audio, so
 * nothing downloads. Electric piano chords (two-operator FM, a little tape
 * wow), a round bass, a swung kit, a bell melody every other phrase, and
 * vinyl crackle, all through a dull tape-ish lowpass and a gentle
 * compressor. `planBar` is the score (pure, seeded, so the same bar always
 * plays the same); `Lofi` turns it into sound a bar at a time.
 */

/** Beats a minute: lofi sits slow. */
export const BPM = 74;
/** Steps (16ths) in a bar. */
export const STEPS = 16;
/** One 16th, in seconds. */
export const STEP = 60 / BPM / 4;
/** Every second 16th lands this fraction of a step late: the swing. */
export const SWING = 0.2;
/** Bars in a phrase, one pass through CHORDS. */
export const PHRASE = 8;

type Chord = { bass: number; keys: readonly number[] };

/**
 * Eight bars in C, IV–iii–ii–I then IV–iii–ii–V, as rootless voicings in
 * the middle of the keyboard (MIDI notes); the bass plays the roots.
 */
export const CHORDS: readonly Chord[] = [
  { bass: 41, keys: [57, 60, 64, 67] }, // Fmaj9: A C E G
  { bass: 40, keys: [55, 59, 62, 66] }, // Em9: G B D F♯
  { bass: 38, keys: [53, 57, 60, 64] }, // Dm9: F A C E
  { bass: 36, keys: [52, 55, 59, 62] }, // Cmaj9: E G B D
  { bass: 41, keys: [57, 60, 64, 67] }, // Fmaj9
  { bass: 40, keys: [55, 59, 62, 67] }, // Em7: G B D G
  { bass: 38, keys: [53, 57, 60, 67] }, // Dm11: F A C G
  { bass: 43, keys: [53, 59, 64, 69] }, // G13: F B E A
];

/** C major pentatonic an octave up: the bell's notes, safe over every chord. */
export const BELL = [72, 74, 76, 79, 81, 84] as const;
/** Steps the bell may land on. */
const BELL_STEPS = [0, 3, 6, 8, 10, 12, 14];

export type Hit =
  | { kind: "kick" | "snare" | "hat"; step: number; vel: number }
  | { kind: "keys"; step: number; vel: number; notes: readonly number[]; steps: number }
  | { kind: "bass" | "bell"; step: number; vel: number; note: number; steps: number };

/** A seeded generator (mulberry32): 0..1, the same run for the same seed. */
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The bell's line for one phrase: two or three notes a bar, moving by small steps. */
function melody(phrase: number): Hit[][] {
  const rand = random(phrase * 104729 + 3);
  let at = 2;
  return CHORDS.map((_, bar) => {
    const count = bar % 4 === 3 ? 1 : 2 + Math.floor(rand() * 2);
    const slots = [...BELL_STEPS];
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    return slots
      .slice(0, count)
      .sort((a, b) => a - b)
      .map((step) => {
        at = Math.min(BELL.length - 1, Math.max(0, at + Math.round((rand() - 0.5) * 4)));
        return { kind: "bell" as const, step, vel: 0.35 + rand() * 0.2, note: BELL[at], steps: 4 };
      });
  });
}

/**
 * What bar `bar` plays (counting from 0, the loop's first). The first two
 * bars are the keys alone, so the music fades in on them; every fourth
 * phrase ends on a bar without kick and snare, a breath; every other
 * phrase has the bell on top.
 */
export function planBar(bar: number): Hit[] {
  const phrase = Math.floor(bar / PHRASE);
  const at = bar % PHRASE;
  const chord = CHORDS[at];
  const odd = at % 2 === 1;
  const rand = random(bar * 7919 + 1);
  const hits: Hit[] = [];

  // The chord on the one, and a softer push later in the bar.
  const push = odd ? 7 : 11;
  hits.push(
    { kind: "keys", step: 0, vel: 0.7, notes: chord.keys, steps: push },
    { kind: "keys", step: push, vel: 0.45, notes: chord.keys.slice(1), steps: STEPS - push },
  );
  if (bar < 2) return hits;

  const answer = rand() < 0.5 ? 0 : rand() < 0.5 ? 7 : 12;
  hits.push(
    { kind: "bass", step: 0, vel: 0.8, note: chord.bass, steps: 7 },
    { kind: "bass", step: 10, vel: 0.6, note: chord.bass + answer, steps: 5 },
  );

  for (let step = 0; step < STEPS; step += 2) {
    hits.push({ kind: "hat", step, vel: (step % 4 === 0 ? 0.55 : 0.4) + (rand() - 0.5) * 0.12 });
  }
  for (let step = 1; step < STEPS; step += 2) {
    if (rand() < 0.15) hits.push({ kind: "hat", step, vel: 0.18 });
  }
  const breath = phrase % 4 === 3 && at === PHRASE - 1;
  if (!breath) {
    hits.push(
      { kind: "kick", step: 0, vel: 0.9 },
      { kind: "kick", step: 10, vel: 0.7 },
      { kind: "snare", step: 4, vel: 0.8 },
      { kind: "snare", step: 12, vel: 0.8 },
    );
    if (odd) hits.push({ kind: "kick", step: 7, vel: 0.5 });
    if (rand() < 0.25) hits.push({ kind: "snare", step: 15, vel: 0.22 });
  }

  if (phrase % 2 === 1) hits.push(...melody(phrase)[at]);
  return hits;
}

/** When step `step` of bar `bar` lands, the loop having started at `start` (s). */
export function stepTime(start: number, bar: number, step: number) {
  return start + (bar * STEPS + step + (step % 2 ? SWING : 0)) * STEP;
}

/** Tape wow, in cents: a slow sway plus a faster flutter, the same for every note at a given time. */
function wow(from: number, to: number, offset: number) {
  const curve = new Float32Array(32);
  for (let i = 0; i < curve.length; i++) {
    const t = from + ((to - from) * i) / (curve.length - 1);
    curve[i] =
      offset + 6 * Math.sin(2 * Math.PI * 0.33 * t) + 2.5 * Math.sin(2 * Math.PI * 1.1 * t + 1);
  }
  return curve;
}

/** Six seconds of vinyl: a low hiss and scattered crackles, to loop. */
function vinyl(ctx: BaseAudioContext) {
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, rate * 6, rate);
  const data = buffer.getChannelData(0);
  let low = 0;
  for (let i = 0; i < data.length; i++) {
    low += 0.05 * (Math.random() * 2 - 1 - low);
    data[i] = low * 0.25;
  }
  for (let n = 0; n < 6 * 7; n++) {
    const at = Math.floor(Math.random() * (data.length - rate * 0.01));
    const size = (0.08 + 0.92 * Math.random() ** 3) * 0.5;
    const width = rate * 0.0002 * (0.5 + Math.random());
    for (let k = 0; k < width * 5; k++) {
      data[at + k] += size * Math.exp(-k / width) * (Math.random() * 2 - 1);
    }
  }
  return buffer;
}

/**
 * The band. `schedule(until)` books every bar that starts before `until`
 * (context seconds), whole, so a caller polling a little ahead of
 * `currentTime` keeps it seamless. `stop` silences it for good.
 */
export class Lofi {
  readonly #ctx: BaseAudioContext;
  readonly #start: number;
  #bar = 0;
  readonly #out: GainNode;
  readonly #keys: GainNode;
  readonly #bass: GainNode;
  readonly #drums: GainNode;
  readonly #bell: GainNode;
  readonly #crackle: AudioBufferSourceNode;

  constructor(ctx: BaseAudioContext, out: AudioNode, room: AudioNode, start: number) {
    this.#ctx = ctx;
    this.#start = start;

    // Everything → tape lowpass → glue compressor → out.
    const mix = ctx.createGain();
    const tape = ctx.createBiquadFilter();
    tape.type = "lowpass";
    tape.frequency.value = 7000;
    tape.Q.value = 0.5;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -20;
    glue.knee.value = 10;
    glue.ratio.value = 3;
    glue.attack.value = 0.01;
    glue.release.value = 0.25;
    this.#out = ctx.createGain();
    mix.connect(tape).connect(glue).connect(this.#out).connect(out);

    const send = (from: AudioNode, amount: number) => {
      const gain = ctx.createGain();
      gain.gain.value = amount;
      from.connect(gain).connect(room);
    };
    const lowpass = (frequency: number) => {
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = frequency;
      return filter;
    };

    // The keys duck a little under each kick.
    this.#keys = ctx.createGain();
    const keysTone = lowpass(2600);
    this.#keys.connect(keysTone).connect(mix);
    send(keysTone, 0.5);

    this.#bass = ctx.createGain();
    this.#bass.connect(lowpass(420)).connect(mix);

    this.#drums = ctx.createGain();
    this.#drums.connect(mix);
    send(this.#drums, 0.12);

    this.#bell = ctx.createGain();
    this.#bell.connect(mix);
    send(this.#bell, 0.8);

    this.#crackle = ctx.createBufferSource();
    this.#crackle.buffer = vinyl(ctx);
    this.#crackle.loop = true;
    const dust = ctx.createBiquadFilter();
    dust.type = "highpass";
    dust.frequency.value = 900;
    const crackleLevel = ctx.createGain();
    crackleLevel.gain.value = 0.25;
    this.#crackle.connect(dust).connect(crackleLevel).connect(mix);
    this.#crackle.start(start);
  }

  schedule(until: number) {
    while (stepTime(this.#start, this.#bar, 0) < until) {
      for (const hit of planBar(this.#bar)) {
        const t = stepTime(this.#start, this.#bar, hit.step);
        switch (hit.kind) {
          case "keys":
            hit.notes.forEach((note, i) =>
              // Strummed upward, a hair apart.
              this.#piano(t + i * 0.012 + Math.random() * 0.006, note, hit.vel, hit.steps * STEP),
            );
            break;
          case "bass":
            this.#bassNote(t, hit.note, hit.vel, hit.steps * STEP);
            break;
          case "bell":
            this.#bellNote(t, hit.note, hit.vel);
            break;
          case "kick":
            this.#kick(t, hit.vel);
            break;
          case "snare":
            // A hair late: laid back.
            this.#snare(t + 0.012, hit.vel);
            break;
          case "hat":
            this.#hat(t, hit.vel);
            break;
        }
      }
      this.#bar++;
    }
  }

  stop() {
    this.#crackle.stop();
    this.#out.disconnect();
  }

  /** Two-operator FM at 1:1: a bright attack mellowing to a near-sine, as a Rhodes tine does. */
  #piano(t: number, midi: number, vel: number, length: number) {
    const ctx = this.#ctx;
    const f = hz(midi);
    const carrier = ctx.createOscillator();
    const modulator = ctx.createOscillator();
    carrier.frequency.value = f;
    modulator.frequency.value = f;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(f * (0.5 + vel), t);
    depth.gain.setTargetAtTime(f * 0.1, t, 0.3);
    modulator.connect(depth).connect(carrier.frequency);

    const amp = ctx.createGain();
    pluck(amp.gain, t, 0.11 * vel, 0.006, 1.3);
    // Let go at the end of its length.
    amp.gain.setTargetAtTime(0, t + length, 0.15);
    const end = t + length + 0.9;
    const drift = wow(t, end, (Math.random() - 0.5) * 8);
    carrier.detune.setValueCurveAtTime(drift, t, end - t);
    modulator.detune.setValueCurveAtTime(drift, t, end - t);

    carrier.connect(amp).connect(this.#keys);
    carrier.start(t);
    modulator.start(t);
    carrier.stop(end);
    modulator.stop(end);
  }

  #bassNote(t: number, midi: number, vel: number, length: number) {
    const ctx = this.#ctx;
    const f = hz(midi);
    const amp = ctx.createGain();
    const peak = 0.22 * vel;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + 0.015);
    amp.gain.setTargetAtTime(peak * 0.55, t + 0.015, 0.4);
    amp.gain.setTargetAtTime(0, t + length, 0.07);
    const end = t + length + 0.5;
    const sine = ctx.createOscillator();
    sine.frequency.value = f;
    const edge = ctx.createOscillator();
    edge.type = "triangle";
    edge.frequency.value = f;
    const edgeLevel = ctx.createGain();
    edgeLevel.gain.value = 0.25;
    sine.connect(amp);
    edge.connect(edgeLevel).connect(amp);
    amp.connect(this.#bass);
    for (const osc of [sine, edge]) {
      osc.start(t);
      osc.stop(end);
    }
  }

  /** A soft glassy bell: the note and a quick partial two octaves up. */
  #bellNote(t: number, midi: number, vel: number) {
    const ctx = this.#ctx;
    const f = hz(midi);
    tone(ctx, this.#bell, { at: t, freq: f, peak: 0.05 * vel, attack: 0.003, decay: 0.4 });
    tone(ctx, this.#bell, { at: t, freq: f * 4, peak: 0.008 * vel, attack: 0.002, decay: 0.05 });
  }

  #kick(t: number, vel: number) {
    const ctx = this.#ctx;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const amp = ctx.createGain();
    const end = pluck(amp.gain, t, 0.5 * vel, 0.003, 0.1);
    osc.connect(amp).connect(this.#drums);
    osc.start(t);
    osc.stop(end);
    burst(ctx, this.#drums, { at: t, filter: "lowpass", freq: 1500, peak: 0.06 * vel, decay: 0.004 });
    // Duck the keys under it.
    const duck = this.#keys.gain;
    duck.setTargetAtTime(0.75, t, 0.01);
    duck.setTargetAtTime(1, t + 0.04, 0.12);
  }

  #snare(t: number, vel: number) {
    const ctx = this.#ctx;
    burst(ctx, this.#drums, {
      at: t,
      filter: "bandpass",
      freq: 1800,
      q: 0.9,
      peak: 0.25 * vel,
      decay: 0.05,
    });
    tone(ctx, this.#drums, {
      at: t,
      type: "triangle",
      freq: 185,
      to: 160,
      glide: 0.05,
      peak: 0.12 * vel,
      decay: 0.03,
    });
  }

  #hat(t: number, vel: number) {
    burst(this.#ctx, this.#drums, {
      at: t,
      filter: "highpass",
      freq: 5000,
      q: 0.7,
      peak: 0.08 * vel,
      decay: 0.012,
    });
  }
}
