import { describe, expect, it, vi } from "vitest";
import { AUDIO_FORMATS, type AudioFormat } from "../lib/audio-format";
import { buildEmail, RESEND_ENDPOINT, sendEmail, type ResendEmail } from "./resend";
import { clipBytes } from "./test-fixtures";
import type { VoiceMemo } from "./validate";

const mail = { from: "Workbench <memos@example.test>", to: "inbox@example.test" };
// 18:32 UTC = 2:32 PM EDT
const receivedAt = new Date("2026-10-17T18:32:00Z");

function memo(format: AudioFormat = AUDIO_FORMATS[0], bytes = clipBytes("webm", 16)): VoiceMemo {
  return { name: "Jane Doe", email: "jane@example.com", seconds: 83.4, audio: { bytes, format } };
}

describe("buildEmail", () => {
  it("builds Resend's REST shape", () => {
    const email = buildEmail(memo(), mail, receivedAt);
    expect(Object.keys(email).sort()).toEqual(
      ["attachments", "from", "reply_to", "subject", "text", "to"].sort(),
    );
    expect(email).toMatchObject({
      from: mail.from,
      to: [mail.to],
      reply_to: "jane@example.com",
      subject: "Voice memo from Jane Doe",
    });
  });

  it("attaches the clip as base64", () => {
    const bytes = clipBytes("webm", 16);
    const [attachment] = buildEmail(memo(AUDIO_FORMATS[0], bytes), mail, receivedAt).attachments;
    expect(attachment.content).toBe(Buffer.from(bytes).toString("base64"));
    expect(new Uint8Array(Buffer.from(attachment.content, "base64"))).toEqual(bytes);
    expect(attachment.content_type).toBe("audio/webm");
  });

  it("names the file on Atlanta time with the format's extension", () => {
    const names = AUDIO_FORMATS.map(
      (format) => buildEmail(memo(format), mail, receivedAt).attachments[0].filename,
    );
    expect(names).toEqual([
      "voice-memo-2026-10-17-1432.webm",
      "voice-memo-2026-10-17-1432.m4a",
      "voice-memo-2026-10-17-1432.ogg",
    ]);
  });

  it("writes a plain-text body with name, email, length and time", () => {
    const { text } = buildEmail(memo(), mail, receivedAt);
    expect(text).toContain("Jane Doe");
    expect(text).toContain("jane@example.com");
    expect(text).toContain("1:23");
    expect(text).toMatch(/Oct 17, 2026.*2:32\s?PM EDT/);
    expect(text).toContain("WebM/Opus");
  });
});

describe("sendEmail", () => {
  const email = buildEmail(memo(), mail, receivedAt);

  it("POSTs JSON with the bearer key and returns the id", async () => {
    const fetchMock = vi.fn(async () => Response.json({ id: "abc-123" }));
    const result = await sendEmail(email, "re_test_key", fetchMock as typeof fetch);
    expect(result).toEqual({ ok: true, id: "abc-123" });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(RESEND_ENDPOINT);
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      Authorization: "Bearer re_test_key",
      "Content-Type": "application/json",
    });
    expect(JSON.parse(init.body as string) as ResendEmail).toEqual(email);
  });

  it("reports Resend's status on an error", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ statusCode: 422, name: "validation_error" }, { status: 422 }),
    );
    expect(await sendEmail(email, "re_test_key", fetchMock as typeof fetch)).toEqual({
      ok: false,
      status: 422,
    });
  });

  it("never throws on a network failure", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await sendEmail(email, "re_test_key", fetchMock as typeof fetch)).toEqual({
      ok: false,
      status: 0,
    });
  });
});
