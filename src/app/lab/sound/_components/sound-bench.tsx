"use client";

import { useRef, useState } from "react";
import { SpecLabel } from "@/components/manual";
import { Button } from "@/components/ui/button";
// Lab files reach into a feature by path: the sound engine isn't public API.
import { createMix, LEVELS, type Mix } from "@/features/workbench/lib/audio";
import { Lofi, PHRASE, stepTime } from "@/features/workbench/lib/lofi";
import { type Cue, CUE_IDS, CUES } from "@/features/workbench/lib/sfx";

const RATE = 48000;

type Reading = { name: string; peak: number; loudest: number; rms?: number };

const db = (amplitude: number) =>
  amplitude > 0 ? Math.round(20 * Math.log10(amplitude) * 10) / 10 : -Infinity;

/** Peak, the loudest 50 ms window (RMS), and the RMS from `from` on, in dBFS, over both channels. */
function measure(buffer: AudioBuffer, from = 0): Omit<Reading, "name"> {
  const window = Math.floor(buffer.sampleRate * 0.05);
  let peak = 0;
  let loudest = 0;
  let sum = 0;
  let count = 0;
  const start = Math.floor(from * buffer.sampleRate);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i + window <= data.length; i += window) {
      let w = 0;
      for (let k = i; k < i + window; k++) {
        const s = data[k];
        peak = Math.max(peak, Math.abs(s));
        w += s * s;
        if (k >= start) {
          sum += s * s;
          count++;
        }
      }
      loudest = Math.max(loudest, Math.sqrt(w / window));
    }
  }
  return { peak: db(peak), loudest: db(loudest), rms: db(Math.sqrt(sum / Math.max(1, count))) };
}

async function meterMusic(): Promise<Reading[]> {
  const bars = 2 * PHRASE;
  const seconds = stepTime(0, bars, 0) + 1;
  const ctx = new OfflineAudioContext(2, Math.ceil(seconds * RATE), RATE);
  const mix = createMix(ctx, ctx.destination);
  new Lofi(ctx, mix.music, mix.room, 0).schedule(seconds);
  const buffer = await ctx.startRendering();
  const band = measure(buffer, stepTime(0, 2, 0));
  const intro = measure(buffer);
  return [
    { name: `music, bars 3–${bars}`, ...band },
    { name: "music, whole", ...intro },
  ];
}

async function meterCue(cue: Cue): Promise<Reading> {
  const ctx = new OfflineAudioContext(2, RATE * 2.5, RATE);
  const mix = createMix(ctx, ctx.destination);
  CUES[cue]({ ctx, out: mix.sfx, at: 0.05, level: 1 });
  const { peak, loudest } = measure(await ctx.startRendering());
  return { name: cue, peak, loudest };
}

/**
 * Keys for the lofi loop and every cue, played live through the Workbench's
 * mix, and Measure: everything rendered offline and metered (dBFS).
 */
export function SoundBench() {
  const live = useRef<{ ctx: AudioContext; mix: Mix; music?: Lofi; timer?: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [readings, setReadings] = useState<Reading[] | null>(null);
  const [busy, setBusy] = useState(false);

  function context() {
    if (!live.current) {
      const ctx = new AudioContext();
      live.current = { ctx, mix: createMix(ctx, ctx.destination) };
    }
    void live.current.ctx.resume();
    return live.current;
  }

  function toggleMusic() {
    const l = context();
    if (l.music) {
      l.music.stop();
      window.clearInterval(l.timer);
      l.music = undefined;
      setPlaying(false);
      return;
    }
    const music = new Lofi(l.ctx, l.mix.music, l.mix.room, l.ctx.currentTime + 0.1);
    l.mix.music.gain.value = LEVELS.music;
    music.schedule(l.ctx.currentTime + 0.4);
    l.timer = window.setInterval(() => music.schedule(l.ctx.currentTime + 0.4), 150);
    l.music = music;
    setPlaying(true);
  }

  function play(cue: Cue) {
    const { ctx, mix } = context();
    CUES[cue]({ ctx, out: mix.sfx, at: ctx.currentTime + 0.01, level: 1 });
  }

  async function meter() {
    setBusy(true);
    const music = await meterMusic();
    const cues: Reading[] = [];
    for (const cue of CUE_IDS) cues.push(await meterCue(cue));
    setReadings([...music, ...cues]);
    setBusy(false);
  }

  return (
    <main className="mx-auto grid max-w-(--container) gap-10 px-(--gutter) py-12">
      <header className="grid gap-3">
        <SpecLabel>Lab · Workbench</SpecLabel>
        <h1 className="text-display font-light">Sound</h1>
        <p className="max-w-(--measure) text-ink-muted">
          The Workbench&rsquo;s lofi loop and effects, through its mix. Everything is synthesized in
          the browser. Measure renders each offline and prints its level in dBFS.
        </p>
      </header>

      <section className="grid gap-3">
        <SpecLabel>Music</SpecLabel>
        <div>
          <Button variant="outline" onClick={toggleMusic} aria-pressed={playing}>
            {playing ? "Stop music" : "Play music"}
          </Button>
        </div>
      </section>

      <section className="grid gap-3">
        <SpecLabel>Effects</SpecLabel>
        <ul className="flex flex-wrap gap-2">
          {CUE_IDS.map((cue) => (
            <li key={cue}>
              <Button variant="outline" size="sm" onClick={() => play(cue)}>
                {cue}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-3">
        <SpecLabel>Levels</SpecLabel>
        <div>
          <Button onClick={meter} disabled={busy}>
            {busy ? "Measuring…" : "Measure"}
          </Button>
        </div>
        {readings && (
          <table className="w-full max-w-xl font-mono text-sm">
            <thead className="text-left text-ink-muted">
              <tr>
                <th className="py-1 font-normal">Sound</th>
                <th className="py-1 font-normal">Peak</th>
                <th className="py-1 font-normal">Loudest 50 ms</th>
                <th className="py-1 font-normal">RMS</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r.name} className="border-t border-hairline">
                  <td className="py-1">{r.name}</td>
                  <td className="py-1">{r.peak}</td>
                  <td className="py-1">{r.loudest}</td>
                  <td className="py-1">{r.rms ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
