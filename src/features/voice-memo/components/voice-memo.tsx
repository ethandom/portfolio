"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type Ref } from "react";
import { PauseIcon, PlayIcon } from "@phosphor-icons/react";
import { Led } from "@/components/manual";
import { useReducedMotion } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import {
  EMAIL_MAX,
  ENDPOINT,
  FIELD,
  MAX_SECONDS,
  NAME_MAX,
  formatClock,
  spokenLength,
  type VoiceMemoResponse,
} from "../lib/limits";
import {
  MIC_MESSAGES,
  canRetry,
  checkContact,
  sendFailure,
  type ContactErrors,
  type SendFailure,
} from "../lib/messages";
import { useRecorder, useSupportProblem, type Clip } from "./use-recorder";

type Phase = "idle" | "asking" | "recording" | "review" | "sending" | "sent";

type Send =
  | { kind: "editing"; failure?: SendFailure }
  | { kind: "sending" }
  | { kind: "sent"; delivered: boolean };

const METER_SEGMENTS = 24;

/** POSTs the memo; never throws. */
async function post(
  body: FormData,
  signal: AbortSignal,
): Promise<{ ok: true; delivered: boolean } | { ok: false; failure: SendFailure }> {
  let res: Response;
  try {
    res = await fetch(ENDPOINT, { method: "POST", body, signal });
  } catch {
    return { ok: false, failure: sendFailure("network", null) };
  }
  const data = (await res.json().catch(() => null)) as VoiceMemoResponse | null;
  if (res.ok && data?.ok) return { ok: true, delivered: data.delivered };
  return { ok: false, failure: sendFailure(res.status, data) };
}

/**
 * Leave a voice memo: record up to two minutes, play it back, then send it
 * with a name and email. The clip is emailed to Ethan and never stored on
 * the site. Lives at the bottom of the Workbench's contact panel.
 *
 * idle -> asking (mic permission) -> recording -> review (play, re-record,
 * discard, name + email) -> sending -> sent, or back to review with the
 * error and a Try again key.
 */
export function VoiceMemo({
  email = `contact@${siteConfig.domain}`,
  className,
}: {
  /** Where to point people when recording or sending can't work. */
  email?: string;
  className?: string;
}) {
  const meter = useRef<HTMLDivElement>(null);
  const recorder = useRecorder(meter);
  const unsupported = useSupportProblem();
  const reduced = useReducedMotion();

  const [send, setSend] = useState<Send>({ kind: "editing" });
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [errors, setErrors] = useState<ContactErrors>({});
  const aborter = useRef<AbortController | null>(null);

  const recordKey = useRef<HTMLButtonElement>(null);
  const stopKey = useRef<HTMLButtonElement>(null);
  const playKey = useRef<HTMLButtonElement>(null);
  const againKey = useRef<HTMLButtonElement>(null);
  const nameField = useRef<HTMLInputElement>(null);
  const emailField = useRef<HTMLInputElement>(null);

  const id = useId();
  const { clip, elapsed } = recorder;
  const phase: Phase =
    recorder.state !== "idle"
      ? recorder.state
      : clip
        ? send.kind === "editing"
          ? "review"
          : send.kind
        : "idle";
  const problem = unsupported ?? recorder.problem;
  const remaining = Math.max(0, Math.ceil(MAX_SECONDS - elapsed));

  // Keep keyboard focus on the control that replaced the one just pressed.
  const previous = useRef<Phase>(phase);
  useEffect(() => {
    const from = previous.current;
    previous.current = phase;
    if (from === phase) return;
    if (phase === "recording") stopKey.current?.focus();
    else if (phase === "review" && from === "recording") playKey.current?.focus();
    else if (phase === "sent") againKey.current?.focus();
    else if (phase === "idle" && from !== "asking") recordKey.current?.focus();
  }, [phase]);

  useEffect(() => () => aborter.current?.abort(), []);

  function record() {
    aborter.current?.abort();
    setSend({ kind: "editing" });
    setErrors({});
    void recorder.start();
  }

  function startOver() {
    setSend({ kind: "editing" });
    setErrors({});
    recorder.discard();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!clip || send.kind === "sending") return;

    const found = checkContact(name, address);
    setErrors(found);
    if (found.name || found.email) {
      (found.name ? nameField : emailField).current?.focus();
      return;
    }

    const body = new FormData();
    body.set(FIELD.audio, clip.blob, `voice-memo.${clip.format.ext}`);
    body.set(FIELD.name, name.trim());
    body.set(FIELD.email, address.trim());
    body.set(FIELD.duration, clip.seconds.toFixed(1));
    body.set(FIELD.honeypot, String(new FormData(event.currentTarget).get(FIELD.honeypot) ?? ""));

    const controller = new AbortController();
    aborter.current = controller;
    setSend({ kind: "sending" });
    const result = await post(body, controller.signal);
    if (controller.signal.aborted) return;
    if (result.ok) {
      setSend({ kind: "sent", delivered: result.delivered });
      return;
    }
    if (result.failure.fields) setErrors(result.failure.fields);
    setSend({ kind: "editing", failure: result.failure });
  }

  const failure = send.kind === "editing" ? send.failure : undefined;
  const announcement =
    phase === "asking"
      ? "Waiting for microphone permission."
      : phase === "recording"
        ? remaining <= 30
          ? "30 seconds left."
          : "Recording. Up to 2 minutes."
        : phase === "review" && clip && !failure
          ? `Recorded ${spokenLength(clip.seconds)}. Play it back, then add your name and email to send it.`
          : phase === "sending"
            ? "Sending your memo."
            : phase === "sent"
              ? "Sent."
              : "";

  const mailto = (
    <a
      href={`mailto:${email}`}
      className="[overflow-wrap:anywhere] text-ink underline decoration-rule decoration-1 underline-offset-4 transition-colors duration-(--dur-fast) hover:decoration-accent"
    >
      {email}
    </a>
  );

  return (
    <section aria-labelledby={`${id}-h`} className={cn("grid gap-3", className)}>
      <h3
        id={`${id}-h`}
        className="border-b border-hairline pb-1.5 font-mono text-label text-ink-muted uppercase"
      >
        Leave a voice memo
      </h3>
      <p className="text-sm text-ink-muted">
        Rather say it out loud? Record a message, up to 2 minutes, and I&apos;ll reply by email.
      </p>

      {(phase === "idle" || phase === "asking") && (!problem || canRetry(problem)) && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            ref={recordKey}
            variant="outline"
            aria-disabled={phase === "asking" || undefined}
            onClick={phase === "asking" ? undefined : record}
            className="aria-disabled:text-ink-muted"
          >
            <Led state="accent" className="size-2" />
            {phase === "asking" ? "Allow the mic…" : problem ? "Try again" : "Record"}
          </Button>
          <span className="font-mono text-label text-ink-muted uppercase">
            Up to {formatClock(MAX_SECONDS)}
          </span>
        </div>
      )}

      {problem && (
        <p role={recorder.problem ? "alert" : undefined} className="text-sm text-ink">
          <span className="text-error">{MIC_MESSAGES[problem]}</span> You can email me at{" "}
          {mailto} instead.
        </p>
      )}

      {phase === "recording" && (
        <>
          <div className="grid gap-3 border border-strong bg-surface p-3">
            <div className="flex items-center justify-between gap-3 font-mono text-label uppercase">
              <span className="flex items-center gap-2 text-ink">
                <Led
                  state="accent"
                  className={cn(
                    "size-2",
                    !reduced && "animate-[caret-blink_1.2s_steps(1,end)_infinite]",
                  )}
                />
                Rec <span className="tabular-nums">{formatClock(elapsed)}</span>
              </span>
              <span className="text-ink-muted tabular-nums">{formatClock(remaining)} left</span>
            </div>
            <div
              ref={meter}
              aria-hidden
              className="grid h-3 grid-cols-[repeat(24,minmax(0,1fr))] gap-px"
            >
              {Array.from({ length: METER_SEGMENTS }, (_, i) => (
                <span key={i} className="bg-sunken data-on:bg-accent" />
              ))}
            </div>
          </div>
          <div>
            <Button ref={stopKey} onClick={recorder.stop}>
              <span aria-hidden className="size-2 bg-current" />
              Stop
            </Button>
          </div>
        </>
      )}

      {(phase === "review" || phase === "sending") && clip && (
        <form noValidate onSubmit={submit} aria-busy={phase === "sending"} className="grid gap-4">
          <div className="grid gap-2">
            <Playback key={clip.url} clip={clip} playRef={playKey} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={phase === "sending"}
                onClick={record}
              >
                Re-record
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={phase === "sending"}
                onClick={startOver}
              >
                Discard
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <Field
              id={`${id}-name`}
              label="Name"
              error={errors.name}
              inputRef={nameField}
              value={name}
              onChange={setName}
              readOnly={phase === "sending"}
              autoComplete="name"
              maxLength={NAME_MAX}
            />
            <Field
              id={`${id}-email`}
              label="Email"
              type="email"
              error={errors.email}
              inputRef={emailField}
              value={address}
              onChange={setAddress}
              readOnly={phase === "sending"}
              autoComplete="email"
              maxLength={EMAIL_MAX}
            />
            {/* Honeypot: hidden from people and assistive tech; bots fill it in. */}
            <div aria-hidden className="sr-only">
              <label>
                Website
                <input name={FIELD.honeypot} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
              </label>
            </div>
          </div>

          <div className="grid gap-2">
            <div>
              <Button type="submit" aria-disabled={phase === "sending" || undefined}>
                {phase === "sending" ? "Sending…" : failure ? "Try again" : "Send memo"}
              </Button>
            </div>
            {failure && (
              <p role="alert" className="text-sm text-ink">
                <span className="text-error">{failure.message}</span>
                {failure.offerEmail && <> You can also email me at {mailto}.</>}
              </p>
            )}
          </div>
        </form>
      )}

      {phase === "sent" && (
        <>
          <div className="grid gap-1.5 border border-strong bg-surface p-3">
            <p className="flex items-baseline gap-2 text-sm text-ink">
              <Led state="live" className="relative -top-px" />
              <span>
                Sent. Thanks{name.trim() ? `, ${name.trim().split(/\s+/)[0]}` : ""}. I&apos;ll reply
                to <span className="[overflow-wrap:anywhere]">{address.trim()}</span>.
              </span>
            </p>
            {send.kind === "sent" && !send.delivered && (
              <p className="font-mono text-label text-ink-muted uppercase">
                Dry run: no email key is set, so nothing was emailed
              </p>
            )}
          </div>
          <div>
            <Button ref={againKey} size="sm" variant="outline" onClick={startOver}>
              Record another
            </Button>
          </div>
        </>
      )}

      <p role="status" className="sr-only">
        {announcement}
      </p>

      <p className="text-sm text-ink-muted">
        Your recording, name and email are emailed to me. Nothing is stored on this site.
      </p>
    </section>
  );
}

/** Play/pause for the take, with its position. WebM clips report no duration, so the take's own length is the scale. */
function Playback({ clip, playRef }: { clip: Clip; playRef: Ref<HTMLButtonElement> }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const share = Math.min(1, position / Math.max(clip.seconds, 0.1));

  function toggle() {
    const el = audio.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  return (
    <div className="flex items-center gap-3 border border-strong bg-surface p-2">
      <audio
        ref={audio}
        src={clip.url}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setPosition(0);
        }}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      />
      <Button
        ref={playRef}
        type="button"
        size="sm"
        variant="outline"
        onClick={toggle}
        aria-label={playing ? "Pause your recording" : "Play your recording"}
      >
        {playing ? <PauseIcon weight="light" /> : <PlayIcon weight="light" />}
        {playing ? "Pause" : "Play"}
      </Button>
      <div aria-hidden className="h-1 min-w-0 flex-1 bg-sunken">
        <div className="h-full bg-accent" style={{ width: `${share * 100}%` }} />
      </div>
      <span className="shrink-0 font-mono text-label text-ink-muted tabular-nums">
        {formatClock(Math.min(position, clip.seconds))} / {formatClock(clip.seconds)}
      </span>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  inputRef,
  onChange,
  ...input
}: {
  id: string;
  label: string;
  error?: string;
  inputRef: Ref<HTMLInputElement>;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email";
  readOnly?: boolean;
  autoComplete: string;
  maxLength: number;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="font-mono text-label text-ink-muted uppercase">
        {label}
      </label>
      <input
        id={id}
        ref={inputRef}
        name={input.autoComplete}
        type="text"
        required
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full min-w-0 border border-rule bg-surface px-2.5 text-sm text-ink transition-colors duration-(--dur-fast) ease-out hover:border-strong focus-visible:border-strong read-only:text-ink-muted aria-invalid:border-error"
        {...input}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-error">
          {error}
        </p>
      )}
    </div>
  );
}
