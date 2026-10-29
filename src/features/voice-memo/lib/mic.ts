/** Why the recorder can't run here. Each one gets a short message and the email fallback. */
export type MicProblem =
  | "insecure"
  | "unsupported"
  | "denied"
  | "no-device"
  | "busy"
  | "failed";

/** What the browser offers, read once before asking for the mic. */
export type RecorderSupport = {
  isSecureContext: boolean;
  hasMediaRecorder: boolean;
  hasGetUserMedia: boolean;
  /** Whether any of the allowed formats can be recorded. */
  hasFormat: boolean;
};

/** A problem that rules recording out before the mic is even asked for. */
export function supportProblem(support: RecorderSupport): MicProblem | undefined {
  // Browsers hide getUserMedia outside https (and localhost), so check that first.
  if (!support.isSecureContext) return "insecure";
  if (!support.hasMediaRecorder || !support.hasGetUserMedia || !support.hasFormat) {
    return "unsupported";
  }
  return undefined;
}

/** Maps a getUserMedia / MediaRecorder failure to a problem. */
export function micProblemFrom(error: unknown): MicProblem {
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String((error as { name: unknown }).name)
      : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "DevicesNotFoundError":
    case "OverconstrainedError":
      return "no-device";
    case "NotReadableError":
    case "TrackStartError":
    case "AbortError":
      return "busy";
    case "NotSupportedError":
      return "unsupported";
    default:
      return "failed";
  }
}

/** How long a muted mic may take to start delivering sound before the attempt gives up. */
export const LIVE_TIMEOUT_MS = 20_000;

/** The part of a MediaStreamTrack `untilLive` reads. */
export type LiveTrack = Pick<
  MediaStreamTrack,
  "muted" | "readyState" | "addEventListener" | "removeEventListener"
>;

/**
 * Resolves true once `track` delivers sound: at once if it already does.
 * A browser can hand the stream over before access is really settled, its
 * track muted until it is (macOS asks for the browser app separately from
 * the site), so a take started then would run on silence. False if the
 * track ends, stays muted past the timeout, or `signal` aborts.
 */
export function untilLive(
  track: LiveTrack | undefined,
  signal: AbortSignal,
  timeoutMs = LIVE_TIMEOUT_MS,
): Promise<boolean> {
  if (!track || track.readyState === "ended" || signal.aborted) return Promise.resolve(false);
  if (!track.muted) return Promise.resolve(true);
  return new Promise((resolve) => {
    const done = (live: boolean) => {
      clearTimeout(timer);
      track.removeEventListener("unmute", on);
      track.removeEventListener("ended", off);
      signal.removeEventListener("abort", off);
      resolve(live);
    };
    const on = () => done(true);
    const off = () => done(false);
    const timer = setTimeout(off, timeoutMs);
    track.addEventListener("unmute", on);
    track.addEventListener("ended", off);
    signal.addEventListener("abort", off);
  });
}
