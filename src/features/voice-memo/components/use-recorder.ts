"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { prefersReducedMotion } from "@/components/motion";
import { formatOf, pickRecordingType, type AudioFormat } from "../lib/audio-format";
import { AUDIO_BITS_PER_SECOND, MAX_SECONDS } from "../lib/limits";
import { micProblemFrom, supportProblem, untilLive, type MicProblem } from "../lib/mic";

export type Clip = {
  blob: Blob;
  /** Object URL for playback; revoked when the clip is dropped. */
  url: string;
  seconds: number;
  format: AudioFormat;
};

export type RecorderState = "idle" | "asking" | "recording";

type Session = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  format: AudioFormat;
  startedAt: number;
  stoppedAt?: number;
  audio?: AudioContext;
  raf?: number;
  timer?: number;
  /** Unmounted or failed: drop whatever the recorder hands back. */
  cancelled: boolean;
};

const TICK_MS = 250;
/** Under reduced motion the meter steps four times a second instead of every frame. */
const REDUCED_METER_MS = 250;

function recordingFormat(): AudioFormat | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return pickRecordingType((type) => MediaRecorder.isTypeSupported(type));
}

function readSupportProblem(): MicProblem | null {
  return (
    supportProblem({
      isSecureContext: window.isSecureContext,
      hasMediaRecorder: typeof MediaRecorder !== "undefined",
      hasGetUserMedia: typeof navigator.mediaDevices?.getUserMedia === "function",
      hasFormat: recordingFormat() !== undefined,
    }) ?? null
  );
}

const never = () => () => {};

/** A problem that rules recording out in this browser, known before any click. */
export function useSupportProblem(): MicProblem | null {
  return useSyncExternalStore(never, readSupportProblem, () => null);
}

function stopTracks(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

/** Lets go of the mic and everything listening to it. */
function release(s: Session) {
  if (s.raf !== undefined) cancelAnimationFrame(s.raf);
  if (s.timer !== undefined) clearInterval(s.timer);
  s.raf = undefined;
  s.timer = undefined;
  stopTracks(s.stream);
  s.audio?.close().catch(() => {});
  s.audio = undefined;
}

/** Lights the first `level` share of the meter's segments. */
function paint(meter: HTMLElement | null, level: number) {
  if (!meter) return;
  const segments = meter.children;
  const lit = Math.round(level * segments.length);
  for (let i = 0; i < segments.length; i++) {
    segments[i].toggleAttribute("data-on", i < lit);
  }
}

/** Drives the level meter from the live input. Decoration: if it fails, the meter stays dark. */
function startMeter(s: Session, meter: RefObject<HTMLElement | null>) {
  const Context =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  try {
    const audio = new Context();
    s.audio = audio;
    // Safari may create it suspended once the permission prompt has eaten the click.
    audio.resume().catch(() => {});
    const analyser = audio.createAnalyser();
    analyser.fftSize = 1024;
    audio.createMediaStreamSource(s.stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    const reduced = prefersReducedMotion();
    let last = -Infinity;
    const frame = (t: number) => {
      s.raf = requestAnimationFrame(frame);
      if (reduced && t - last < REDUCED_METER_MS) return;
      last = t;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const v of samples) sum += v * v;
      const db = 20 * Math.log10(Math.max(Math.sqrt(sum / samples.length), 1e-6));
      // A quiet room (-54 dBFS) to a raised voice (-6 dBFS) spans the meter.
      paint(meter.current, Math.min(1, Math.max(0, (db + 54) / 48)));
    };
    s.raf = requestAnimationFrame(frame);
  } catch {
    // No meter; the recording itself is unaffected.
  }
}

/**
 * The microphone side of the voice memo: ask, record (auto-stop at the
 * limit), hand back a clip. "asking" lasts until the recorder has really
 * started on a mic that delivers sound, so the clock never runs while the
 * browser or the OS is still asking. The mic is released the moment
 * recording stops, on any failure, and on unmount.
 */
export function useRecorder(meter: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [clip, setClip] = useState<Clip | null>(null);
  const [problem, setProblem] = useState<MicProblem | null>(null);
  const session = useRef<Session | null>(null);
  // Bumped on unmount, so a permission prompt answered afterwards is ignored.
  const attempts = useRef(0);
  // Aborted on unmount: stops waiting for a muted mic to come live.
  const waiting = useRef<AbortController | null>(null);

  function fail(s: Session | null, next: MicProblem) {
    if (s) {
      s.cancelled = true;
      release(s);
      if (session.current === s) session.current = null;
    }
    setState("idle");
    setProblem(next);
  }

  function stop() {
    const s = session.current;
    if (!s || s.recorder.state === "inactive") return;
    s.stoppedAt = performance.now();
    if (s.timer !== undefined) clearInterval(s.timer);
    s.timer = undefined;
    // onstop releases the mic and hands over the clip.
    s.recorder.stop();
  }

  async function start() {
    if (state !== "idle") return;
    setClip(null);
    setProblem(null);

    const format = recordingFormat();
    const blocked = readSupportProblem();
    if (blocked || !format) {
      setProblem(blocked ?? "unsupported");
      return;
    }

    const attempt = ++attempts.current;
    setState("asking");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (error) {
      if (attempt === attempts.current) fail(null, micProblemFrom(error));
      return;
    }
    // Unmounted while the prompt was up: hand the mic straight back.
    if (attempt !== attempts.current) {
      stopTracks(stream);
      return;
    }
    const wait = new AbortController();
    waiting.current = wait;
    const live = await untilLive(stream.getAudioTracks()[0], wait.signal);
    if (waiting.current === wait) waiting.current = null;
    if (attempt !== attempts.current) {
      stopTracks(stream);
      return;
    }
    if (!live) {
      stopTracks(stream);
      fail(null, "failed");
      return;
    }

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, {
        mimeType: format.mime,
        audioBitsPerSecond: AUDIO_BITS_PER_SECOND,
      });
    } catch (error) {
      stopTracks(stream);
      fail(null, micProblemFrom(error));
      return;
    }

    const s: Session = {
      stream,
      recorder,
      chunks: [],
      format,
      startedAt: performance.now(),
      cancelled: false,
    };
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) s.chunks.push(event.data);
    };
    recorder.onstop = () => {
      release(s);
      if (session.current === s) session.current = null;
      if (s.cancelled) return;
      const seconds = Math.min(MAX_SECONDS, ((s.stoppedAt ?? performance.now()) - s.startedAt) / 1000);
      const type = recorder.mimeType || format.mime;
      const blob = new Blob(s.chunks, { type });
      setState("idle");
      if (blob.size === 0) {
        setProblem("failed");
        return;
      }
      setClip({ blob, url: URL.createObjectURL(blob), seconds, format: formatOf(type) ?? format });
    };
    recorder.onerror = () => fail(s, "failed");
    // The clock, the meter and the Stop key wait for the recorder to say it
    // has started, not just been asked to.
    recorder.onstart = () => {
      if (s.cancelled) return;
      s.startedAt = performance.now();
      setElapsed(0);
      setState("recording");
      s.timer = window.setInterval(() => {
        const seconds = (performance.now() - s.startedAt) / 1000;
        setElapsed(Math.min(seconds, MAX_SECONDS));
        if (seconds >= MAX_SECONDS) stop();
      }, TICK_MS);
      startMeter(s, meter);
    };
    // A mic unplugged mid-take ends the take; what was recorded is kept.
    stream.getAudioTracks()[0]?.addEventListener("ended", stop);

    session.current = s;
    try {
      // Chunks every second, so a long take never sits in one buffer.
      recorder.start(1000);
    } catch (error) {
      fail(s, micProblemFrom(error));
    }
  }

  /** Drops the clip (and any problem) to start over. */
  function discard() {
    setClip(null);
    setProblem(null);
  }

  useEffect(() => {
    if (!clip) return;
    return () => URL.revokeObjectURL(clip.url);
  }, [clip]);

  useEffect(() => {
    const attemptsRef = attempts;
    const sessionRef = session;
    const waitingRef = waiting;
    return () => {
      attemptsRef.current += 1;
      waitingRef.current?.abort();
      const s = sessionRef.current;
      if (!s) return;
      s.cancelled = true;
      if (s.recorder.state !== "inactive") s.recorder.stop();
      release(s);
      sessionRef.current = null;
    };
  }, []);

  return { state, elapsed, clip, problem, start, stop, discard };
}
