import { describe, expect, it } from "vitest";
import { MAX_AUDIO_BYTES } from "../lib/limits";
import { clip, clipBytes, memoForm } from "./test-fixtures";
import { parseVoiceMemo, sniffContainer } from "./validate";

describe("sniffContainer", () => {
  it("reads each container's magic", () => {
    expect(sniffContainer(clipBytes("webm"))).toBe("audio/webm");
    expect(sniffContainer(clipBytes("mp4"))).toBe("audio/mp4");
    expect(sniffContainer(clipBytes("ogg"))).toBe("audio/ogg");
    expect(sniffContainer(clipBytes("junk"))).toBeUndefined();
    expect(sniffContainer(new Uint8Array(2))).toBeUndefined();
  });
});

describe("parseVoiceMemo", () => {
  it("accepts a good memo and trims the fields", async () => {
    const result = await parseVoiceMemo(
      memoForm({ name: "  Jane Doe ", email: " jane@example.com " }),
    );
    expect(result).toMatchObject({
      ok: true,
      honeypot: false,
      memo: { name: "Jane Doe", email: "jane@example.com", seconds: 42.5 },
    });
    if (result.ok && !result.honeypot) {
      expect(result.memo.audio.format.base).toBe("audio/webm");
      expect(result.memo.audio.bytes.byteLength).toBe(64);
    }
  });

  it("accepts Safari's MP4 and Firefox's Ogg", async () => {
    for (const [kind, type] of [
      ["mp4", "audio/mp4"],
      ["ogg", "audio/ogg;codecs=opus"],
    ] as const) {
      const result = await parseVoiceMemo(memoForm({ audio: clip(kind, type) }));
      expect(result.ok && !result.honeypot && result.memo.audio.format.base).toBe(
        type.split(";")[0],
      );
    }
  });

  it("short-circuits on a filled honeypot", async () => {
    // Even with junk elsewhere: the bot gets its success, nothing is checked.
    const result = await parseVoiceMemo(
      memoForm({ website: "https://spam.example", email: "nope", audio: null }),
    );
    expect(result).toEqual({ ok: true, honeypot: true });
  });

  it("ignores a whitespace-only honeypot", async () => {
    const result = await parseVoiceMemo(memoForm({ website: "  " }));
    expect(result).toMatchObject({ ok: true, honeypot: false });
  });

  it.each([
    ["an empty name", { name: "   " }, "name"],
    ["a 101-character name", { name: "J".repeat(101) }, "name"],
    ["a name with a line break", { name: "Jane\nBcc: x@y.z" }, "name"],
    ["a bad email", { email: "jane@" }, "email"],
    ["a 255-character email", { email: `${"a".repeat(243)}@example.com` }, "email"],
    ["a zero duration", { duration: "0" }, "duration"],
    ["a non-numeric duration", { duration: "long" }, "duration"],
    ["a duration over 125 s", { duration: "125.1" }, "duration"],
  ])("rejects %s", async (_, overrides, field) => {
    const result = await parseVoiceMemo(memoForm(overrides));
    expect(result).toMatchObject({ ok: false, status: 400, error: "invalid" });
    if (!result.ok) expect(result.fields?.[field as "name"]).toEqual(expect.any(String));
  });

  it("allows exactly 100 characters, 254-character emails and 125 s", async () => {
    const result = await parseVoiceMemo(
      memoForm({
        name: "J".repeat(100),
        email: `${"a".repeat(242)}@example.com`,
        duration: "125",
      }),
    );
    expect(result).toMatchObject({ ok: true, honeypot: false });
  });

  it("requires the audio", async () => {
    expect(await parseVoiceMemo(memoForm({ audio: null }))).toMatchObject({
      ok: false,
      status: 400,
      fields: { audio: expect.any(String) },
    });
    expect(await parseVoiceMemo(memoForm({ audio: "not a file" }))).toMatchObject({
      ok: false,
      status: 400,
    });
    const empty = new File([], "x.webm", { type: "audio/webm" });
    expect(await parseVoiceMemo(memoForm({ audio: empty }))).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("rejects clips over 2.5 MB with 413", async () => {
    expect(
      await parseVoiceMemo(memoForm({ audio: clip("webm", undefined, MAX_AUDIO_BYTES) })),
    ).toMatchObject({ ok: true });
    expect(
      await parseVoiceMemo(memoForm({ audio: clip("webm", undefined, MAX_AUDIO_BYTES + 1) })),
    ).toMatchObject({ ok: false, status: 413, error: "too_large" });
  });

  it("rejects other MIME types with 415", async () => {
    for (const type of ["audio/wav", "video/webm", "application/pdf", ""]) {
      expect(await parseVoiceMemo(memoForm({ audio: clip("webm", type) }))).toMatchObject({
        ok: false,
        status: 415,
        error: "unsupported_audio",
      });
    }
  });

  it("rejects a file whose bytes don't match its type", async () => {
    expect(
      await parseVoiceMemo(memoForm({ audio: clip("junk", "audio/webm") })),
    ).toMatchObject({ ok: false, status: 415 });
    expect(
      await parseVoiceMemo(memoForm({ audio: clip("ogg", "audio/mp4") })),
    ).toMatchObject({ ok: false, status: 415 });
  });
});
