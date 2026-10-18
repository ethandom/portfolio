import "server-only";
import { siteConfig } from "@/config/site";
import { formatClock } from "../lib/limits";
import type { MailConfig } from "./env";
import type { VoiceMemo } from "./validate";

export const RESEND_ENDPOINT = "https://api.resend.com/emails";

/** Memos are stamped on Atlanta time, where Ethan reads them. */
const TIME_ZONE = "America/New_York";

/** The body of Resend's POST /emails, in its REST (snake_case) shape. */
export type ResendEmail = {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
  attachments: { filename: string; content: string; content_type: string }[];
};

/** "2026-10-17-1432": a sortable stamp for the attachment's file name. */
function fileStamp(at: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(at)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}${parts.minute}`;
}

/** "Sat, Oct 17, 2026, 2:32 PM EDT" */
function readableTime(at: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(at);
}

/** The email for one memo: the clip attached, replies going to the sender. */
export function buildEmail(memo: VoiceMemo, mail: MailConfig, receivedAt: Date): ResendEmail {
  const { format, bytes } = memo.audio;
  const text = [
    `A voice memo left on the Workbench at ${siteConfig.domain}.`,
    "",
    `From:      ${memo.name}`,
    `Email:     ${memo.email}`,
    `Length:    ${formatClock(memo.seconds)}`,
    `Received:  ${readableTime(receivedAt)}`,
    "",
    `The recording is attached (${format.label}). Reply to this email to answer ${memo.name} directly.`,
  ].join("\n");

  return {
    from: mail.from,
    to: [mail.to],
    reply_to: memo.email,
    subject: `Voice memo from ${memo.name}`,
    text,
    attachments: [
      {
        filename: `voice-memo-${fileStamp(receivedAt)}.${format.ext}`,
        content: Buffer.from(bytes).toString("base64"),
        content_type: format.base,
      },
    ],
  };
}

export type SendResult = { ok: true; id?: string } | { ok: false; status: number };

/** POSTs to Resend. Never throws; a network failure or timeout is status 0. */
export async function sendEmail(
  email: ResendEmail,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  try {
    const res = await fetchImpl(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(email),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const body: unknown = await res.json().catch(() => null);
    const id =
      typeof body === "object" && body !== null && "id" in body && typeof body.id === "string"
        ? body.id
        : undefined;
    return { ok: true, id };
  } catch {
    return { ok: false, status: 0 };
  }
}
