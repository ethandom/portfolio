import "server-only";
import { formatClock, MAX_AUDIO_BYTES, type VoiceMemoResponse } from "../lib/limits";
import { isEnabled, isProduction, mailConfig, readEnv, type VoiceMemoEnv } from "./env";
import { clientKey, createRateLimiter, type RateLimiter } from "./rate-limit";
import { buildEmail, sendEmail } from "./resend";
import { parseVoiceMemo } from "./validate";

/** Room for the text fields and multipart boundaries on top of the clip. */
const MAX_REQUEST_BYTES = MAX_AUDIO_BYTES + 64 * 1024;

/** 3 memos per visitor per 10 minutes, per server instance (see rate-limit.ts). */
const limiter = createRateLimiter({ limit: 3, windowMs: 10 * 60 * 1000 });

export type Deps = {
  env: VoiceMemoEnv;
  fetch: typeof fetch;
  now: () => Date;
  limiter: RateLimiter;
  log: Pick<Console, "info" | "error">;
};

function reply(status: number, body: VoiceMemoResponse, headers?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}

/**
 * Browsers send Origin on every POST, so a form or script on another site
 * shows up here with a foreign one. No Origin (curl, server code) passes;
 * the limiter still applies.
 */
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * POST /api/voice-memo: multipart audio + name + email + duration (+ the
 * honeypot), emailed to Ethan through Resend. Nothing is stored. Never logs
 * the audio or the sender's details.
 */
export async function handleVoiceMemo(request: Request, deps: Partial<Deps> = {}): Promise<Response> {
  const {
    env = readEnv(),
    fetch: fetchImpl = fetch,
    now = () => new Date(),
    limiter: limits = limiter,
    log = console,
  } = deps;

  if (!isEnabled(env)) return new Response("Not found\n", { status: 404 });

  if (!sameOrigin(request)) return reply(403, { ok: false, error: "forbidden" });

  const declared = Number(request.headers.get("content-length"));
  if (declared > MAX_REQUEST_BYTES) return reply(413, { ok: false, error: "too_large" });

  const key = clientKey(request);
  // Turn away a visitor already at the limit before reading a 2 MB body.
  const early = limits.peek(key);
  if (!early.ok) {
    return reply(
      429,
      { ok: false, error: "rate_limited", retryAfter: early.retryAfter },
      { "Retry-After": String(early.retryAfter) },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return reply(400, { ok: false, error: "invalid" });
  }

  const parsed = await parseVoiceMemo(form);
  if (!parsed.ok) {
    return reply(parsed.status, { ok: false, error: parsed.error, fields: parsed.fields });
  }

  // Counted after validation, so a typo doesn't use up a send; bots that
  // trip the honeypot are counted too.
  const slot = limits.take(key);
  if (!slot.ok) {
    return reply(
      429,
      { ok: false, error: "rate_limited", retryAfter: slot.retryAfter },
      { "Retry-After": String(slot.retryAfter) },
    );
  }

  // Looks like success to the bot; nothing is sent.
  if (parsed.honeypot) return reply(200, { ok: true, delivered: true });

  const { memo } = parsed;
  const apiKey = env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (isProduction(env)) {
      limits.release(key);
      log.error("[voice-memo] RESEND_API_KEY is not set; memo not sent");
      return reply(503, { ok: false, error: "unavailable" });
    }
    // Development: say what would have gone out, without the sender's details.
    log.info(
      `[voice-memo] dry run, no RESEND_API_KEY: ${Math.round(memo.audio.bytes.byteLength / 1024)} KB ${memo.audio.format.label}, ${formatClock(memo.seconds)}, not emailed`,
    );
    return reply(200, { ok: true, delivered: false });
  }

  const result = await sendEmail(buildEmail(memo, mailConfig(env), now()), apiKey, fetchImpl);
  if (!result.ok) {
    // Our failure, not theirs: give the send back so a retry isn't blocked.
    limits.release(key);
    log.error(`[voice-memo] Resend failed (status ${result.status || "network"})`);
    return reply(502, { ok: false, error: "upstream" });
  }
  return reply(200, { ok: true, delivered: true });
}
