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
