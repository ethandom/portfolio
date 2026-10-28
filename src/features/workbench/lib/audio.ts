/**
 * Web Audio building blocks for the Workbench's sound: every effect and
 * the music are made on the fly from oscillators and noise, so there is
 * nothing to download. Everything takes a BaseAudioContext, so an
 * OfflineAudioContext can render it for measuring (/lab/sound).
 */

/** Hz for a MIDI note (A4 = 69 = 440 Hz). */
export const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

const noises = new WeakMap<BaseAudioContext, AudioBuffer>();

/** Two seconds of white noise, made once per context. */
export function noiseBuffer(ctx: BaseAudioContext) {
  let buffer = noises.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    noises.set(ctx, buffer);
  }
  return buffer;
}

/**
 * A plucked envelope on `gain`: silent until `at`, up to `peak` over
 * `attack`, then falling away with time constant `decay` (so about 99%
 * gone after 5 × decay). Returns when it can stop.
 */
export function pluck(
  gain: AudioParam,
  at: number,
  peak: number,
  attack: number,
  decay: number,
) {
  gain.setValueAtTime(0, at);
  gain.linearRampToValueAtTime(peak, at + attack);
  gain.setTargetAtTime(0, at + attack, decay);
  return at + attack + decay * 6;
}

export type Tone = {
  at: number;
  freq: number;
  /** Glides to this frequency over `glide` seconds. */
  to?: number;
  glide?: number;
  type?: OscillatorType;
  peak: number;
  attack?: number;
  decay: number;
};

/** One oscillator with a plucked envelope, into `out`. */
export function tone(ctx: BaseAudioContext, out: AudioNode, t: Tone) {
  const osc = ctx.createOscillator();
  osc.type = t.type ?? "sine";
  osc.frequency.setValueAtTime(t.freq, t.at);
  if (t.to) osc.frequency.exponentialRampToValueAtTime(t.to, t.at + (t.glide ?? t.decay));
  const amp = ctx.createGain();
  const end = pluck(amp.gain, t.at, t.peak, t.attack ?? 0.002, t.decay);
  osc.connect(amp).connect(out);
  osc.start(t.at);
  osc.stop(end);
}

export type Burst = {
  at: number;
  filter: BiquadFilterType;
  freq: number;
  /** Sweeps the filter to this frequency over `glide` seconds. */
  to?: number;
  glide?: number;
  q?: number;
  peak: number;
  attack?: number;
  decay: number;
};

/** Filtered noise with a plucked envelope, into `out`. */
export function burst(ctx: BaseAudioContext, out: AudioNode, b: Burst) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = b.filter;
  filter.Q.value = b.q ?? 1;
  filter.frequency.setValueAtTime(b.freq, b.at);
  if (b.to) filter.frequency.exponentialRampToValueAtTime(b.to, b.at + (b.glide ?? b.decay));
  const amp = ctx.createGain();
  const end = pluck(amp.gain, b.at, b.peak, b.attack ?? 0.001, b.decay);
  src.connect(filter).connect(amp).connect(out);
  // A different stretch of the noise each time.
  src.start(b.at, Math.random() * 1.5);
  src.stop(end);
}

/**
 * A dark room: stereo noise falling away over `seconds`, a one-pole
 * lowpass taking the top off, for a ConvolverNode.
 */
export function roomImpulse(ctx: BaseAudioContext, seconds = 2.2) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const data = buffer.getChannelData(c);
    let low = 0;
    for (let i = 0; i < length; i++) {
      low += 0.3 * (Math.random() * 2 - 1 - low);
      data[i] = low * (1 - i / length) ** 3;
    }
  }
  return buffer;
}

/** Where sound goes: a bus each for the music and the effects, and a shared room. */
export type Mix = {
  /** Everything; fades for mute. */
  master: GainNode;
  music: GainNode;
  sfx: GainNode;
  /** The room's input: a send for anything that should sound placed in the loft. */
  room: GainNode;
};

/**
 * How loud each bus sits (0..1). Soft: the room should never shout. The
 * compressors add makeup gain, so these read low; /lab/sound meters the
 * result (2026-10-28: music about -29 dBFS RMS, effects peaking -21 to -40).
 */
export const LEVELS = { music: 0.12, sfx: 0.6, room: 0.35, sfxRoom: 0.25 } as const;

/**
 * The mix: music and effects into the master, a small room reverb (the
 * effects always send a little; the music picks what it sends), and a
 * limiter last so stacked sounds never clip.
 */
export function createMix(ctx: BaseAudioContext, destination: AudioNode): Mix {
  const master = ctx.createGain();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -9;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.2;
  master.connect(limiter).connect(destination);

  const music = ctx.createGain();
  music.gain.value = LEVELS.music;
  music.connect(master);
  const sfx = ctx.createGain();
  sfx.gain.value = LEVELS.sfx;
  sfx.connect(master);

  const room = ctx.createGain();
  const reverb = ctx.createConvolver();
  reverb.buffer = roomImpulse(ctx);
  const wet = ctx.createGain();
  wet.gain.value = LEVELS.room;
  room.connect(reverb).connect(wet).connect(master);
  const send = ctx.createGain();
  send.gain.value = LEVELS.sfxRoom;
  sfx.connect(send).connect(room);
  return { master, music, sfx, room };
}
