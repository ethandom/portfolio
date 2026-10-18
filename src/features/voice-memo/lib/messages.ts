import { EMAIL_MAX, NAME_MAX, type VoiceMemoResponse } from "./limits";
import type { MicProblem } from "./mic";

/** One plain line per problem; the component adds the email fallback after it. */
export const MIC_MESSAGES: Record<MicProblem, string> = {
  insecure: "Recording only works on a secure (https) page.",
  unsupported: "This browser can't record audio here.",
  denied: "Microphone access is blocked. Allow it in your browser's site settings, then try again.",
  "no-device": "No microphone was found.",
  busy: "Your microphone is busy in another app.",
  failed: "The recording didn't start.",
};

/** Problems a second try can fix (the others are the browser or the page). */
export function canRetry(problem: MicProblem): boolean {
  return problem !== "insecure" && problem !== "unsupported";
}

export type ContactErrors = { name?: string; email?: string };

/**
 * The client's check of the two fields, mirroring the server's so most
 * mistakes are caught before an upload. The server stays the authority.
 */
export function checkContact(name: string, email: string): ContactErrors {
  const errors: ContactErrors = {};
  const n = name.trim();
  const e = email.trim();
  if (!n) errors.name = "Enter your name.";
  else if (n.length > NAME_MAX) errors.name = `Keep your name under ${NAME_MAX} characters.`;
  if (!e) errors.email = "Enter your email so I can reply.";
  else if (e.length > EMAIL_MAX || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    errors.email = "Enter a valid email.";
  }
  return errors;
}

export type SendFailure = {
  message: string;
  /** Point to plain email as the way through. */
  offerEmail: boolean;
  fields?: ContactErrors;
};

/** What to tell the sender after a failed POST. `"network"` = no response at all. */
export function sendFailure(
  status: number | "network",
  body: VoiceMemoResponse | null,
): SendFailure {
  if (status === "network") {
    return {
      message: "Couldn't reach the server. Check your connection and try again.",
      offerEmail: false,
    };
  }
  const failed = body && !body.ok ? body : undefined;
  switch (failed?.error) {
    case "invalid": {
      const { name, email, audio, duration } = failed.fields ?? {};
      if (name || email) {
        return { message: "Check your name and email.", offerEmail: false, fields: { name, email } };
      }
      return { message: audio ?? duration ?? "Something in the memo didn't check out.", offerEmail: true };
    }
    case "rate_limited": {
      const minutes = Math.max(1, Math.ceil((failed.retryAfter ?? 600) / 60));
      return {
        message: `That's a few memos already. Try again in ${minutes} min.`,
        offerEmail: true,
      };
    }
    case "too_large":
    case "unsupported_audio":
      return { message: "This recording can't be sent.", offerEmail: true };
    case "forbidden":
    case "unavailable":
      return { message: "Memos can't be sent right now.", offerEmail: true };
  }
  // 404 is the production gate: the endpoint is switched off.
  if (status === 404 || status === 503) {
    return { message: "Memos can't be sent right now.", offerEmail: true };
  }
  return { message: "Couldn't send it just now.", offerEmail: true };
}
