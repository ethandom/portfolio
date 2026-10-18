import "server-only";
import { siteConfig } from "@/config/site";

/** Every setting the endpoint reads. Names only live in .env.example. */
export type VoiceMemoEnv = {
  NODE_ENV?: string;
  /** "1" turns the endpoint on in production (it 404s there otherwise). */
  VOICE_MEMO_ENABLED?: string;
  /** Resend API key with sending access. Without it nothing is emailed. */
  RESEND_API_KEY?: string;
  /** Sender, on the domain verified in Resend. */
  VOICE_MEMO_FROM?: string;
  /** Inbox the memos go to. */
  VOICE_MEMO_TO?: string;
};

/** Read at request time, so changing a Vercel env var needs no code change. */
export function readEnv(): VoiceMemoEnv {
  return {
    NODE_ENV: process.env.NODE_ENV,
    VOICE_MEMO_ENABLED: process.env.VOICE_MEMO_ENABLED,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VOICE_MEMO_FROM: process.env.VOICE_MEMO_FROM,
    VOICE_MEMO_TO: process.env.VOICE_MEMO_TO,
  };
}

export function isProduction(env: VoiceMemoEnv): boolean {
  return env.NODE_ENV === "production";
}

/**
 * The switch for shipping: production builds, Vercel previews included,
 * answer 404 until VOICE_MEMO_ENABLED=1, and the Workbench (the only place
 * the recorder lives) leaves the recorder out until then. The page is
 * static, so flipping it takes a redeploy.
 */
export function isEnabled(env: VoiceMemoEnv): boolean {
  if (!isProduction(env)) return true;
  const flag = env.VOICE_MEMO_ENABLED?.trim().toLowerCase();
  return flag === "1" || flag === "true";
}

export type MailConfig = { from: string; to: string };

export function mailConfig(env: VoiceMemoEnv): MailConfig {
  return {
    from: env.VOICE_MEMO_FROM?.trim() || `Workbench <memos@${siteConfig.domain}>`,
    to: env.VOICE_MEMO_TO?.trim() || `contact@${siteConfig.domain}`,
  };
}
