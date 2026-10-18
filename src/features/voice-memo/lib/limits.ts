/**
 * What both sides of the voice memo agree on. Plain constants, safe for the
 * client bundle; the server's checks are a touch looser than the recorder's
 * so a clip that just made it on the client never bounces.
 */

/** The recorder stops itself here. */
export const MAX_SECONDS = 120;

/** The server's ceiling: the recorder's clock and the clip's can drift a little. */
export const MAX_SECONDS_ACCEPTED = 125;

/**
 * Largest clip the server takes. Two minutes at the requested ~40 kbps is
 * about 600 KB; Safari may ignore the bitrate, and even 128 kbps AAC fits.
 */
export const MAX_AUDIO_BYTES = 2.5 * 1024 * 1024;

/** Requested recording bitrate: speech stays clear, the email stays small. */
export const AUDIO_BITS_PER_SECOND = 40_000;

export const NAME_MAX = 100;
export const EMAIL_MAX = 254;

export const ENDPOINT = "/api/voice-memo";

/** Multipart field names. `website` is the honeypot: people never see it. */
export const FIELD = {
  audio: "audio",
  name: "name",
  email: "email",
  duration: "duration",
  honeypot: "website",
} as const;

/** Error codes the endpoint answers with (JSON `error`). */
export type VoiceMemoError =
  | "invalid"
  | "too_large"
  | "unsupported_audio"
  | "forbidden"
  | "rate_limited"
  | "unavailable"
  | "upstream";

export type VoiceMemoField = "name" | "email" | "audio" | "duration";

export type VoiceMemoResponse =
  | { ok: true; delivered: boolean }
  | {
      ok: false;
      error: VoiceMemoError;
      fields?: Partial<Record<VoiceMemoField, string>>;
      retryAfter?: number;
    };

/** "m:ss" for a length in seconds, e.g. 83 -> "1:23". */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** The same length for a screen reader, e.g. 83 -> "1 minute 23 seconds". */
export function spokenLength(seconds: number): string {
  const whole = Math.max(1, Math.round(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  const unit = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  if (!minutes) return unit(rest, "second");
  return rest ? `${unit(minutes, "minute")} ${unit(rest, "second")}` : unit(minutes, "minute");
}
