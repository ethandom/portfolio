import { describe, expect, it } from "vitest";
import { AUDIO_FORMATS, baseMime, formatOf, pickRecordingType } from "./audio-format";
import { formatClock, spokenLength } from "./limits";
import { canRetry, checkContact, sendFailure } from "./messages";
import { micProblemFrom, supportProblem } from "./mic";

describe("clock", () => {
  it("formats m:ss", () => {
    expect(formatClock(0)).toBe("0:00");
    expect(formatClock(9.9)).toBe("0:09");
    expect(formatClock(83)).toBe("1:23");
    expect(formatClock(120)).toBe("2:00");
    expect(formatClock(-3)).toBe("0:00");
  });

  it("speaks lengths", () => {
    expect(spokenLength(1)).toBe("1 second");
    expect(spokenLength(42.4)).toBe("42 seconds");
    expect(spokenLength(60)).toBe("1 minute");
    expect(spokenLength(83)).toBe("1 minute 23 seconds");
    expect(spokenLength(120)).toBe("2 minutes");
  });
});

describe("audio formats", () => {
  it("strips parameters and case", () => {
    expect(baseMime("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(baseMime("Audio/MP4; codecs=mp4a.40.2")).toBe("audio/mp4");
  });

  it("knows only the three containers", () => {
    expect(formatOf("audio/webm;codecs=opus")?.ext).toBe("webm");
    expect(formatOf("audio/mp4")?.ext).toBe("m4a");
    expect(formatOf("audio/ogg; codecs=opus")?.ext).toBe("ogg");
    expect(formatOf("audio/wav")).toBeUndefined();
    expect(formatOf("video/webm")).toBeUndefined();
    expect(formatOf("")).toBeUndefined();
  });

  it("prefers WebM, then MP4 (Safari), then Ogg", () => {
    expect(pickRecordingType(() => true)?.mime).toBe("audio/webm;codecs=opus");
    expect(pickRecordingType((t) => t === "audio/mp4")?.mime).toBe("audio/mp4");
    expect(pickRecordingType((t) => t.startsWith("audio/ogg"))?.mime).toBe(
      "audio/ogg;codecs=opus",
    );
    expect(pickRecordingType(() => false)).toBeUndefined();
    expect(
      pickRecordingType(() => {
        throw new Error("boom");
      }),
    ).toBeUndefined();
  });

  it("lists exactly the formats the README promises", () => {
    expect(AUDIO_FORMATS.map((f) => f.base)).toEqual(["audio/webm", "audio/mp4", "audio/ogg"]);
  });
});

describe("mic problems", () => {
  const ok = { isSecureContext: true, hasMediaRecorder: true, hasGetUserMedia: true, hasFormat: true };

  it("rules out insecure pages first, then missing APIs", () => {
    expect(supportProblem(ok)).toBeUndefined();
    expect(supportProblem({ ...ok, isSecureContext: false, hasGetUserMedia: false })).toBe(
      "insecure",
    );
    expect(supportProblem({ ...ok, hasMediaRecorder: false })).toBe("unsupported");
    expect(supportProblem({ ...ok, hasGetUserMedia: false })).toBe("unsupported");
    expect(supportProblem({ ...ok, hasFormat: false })).toBe("unsupported");
  });

  it("maps getUserMedia errors", () => {
    const err = (name: string) => Object.assign(new Error(name), { name });
    expect(micProblemFrom(err("NotAllowedError"))).toBe("denied");
    expect(micProblemFrom(err("SecurityError"))).toBe("denied");
    expect(micProblemFrom(err("NotFoundError"))).toBe("no-device");
    expect(micProblemFrom(err("OverconstrainedError"))).toBe("no-device");
    expect(micProblemFrom(err("NotReadableError"))).toBe("busy");
    expect(micProblemFrom(err("NotSupportedError"))).toBe("unsupported");
    expect(micProblemFrom(err("TypeError"))).toBe("failed");
    expect(micProblemFrom("nope")).toBe("failed");
  });

  it("offers a retry only where one can help", () => {
    expect(canRetry("denied")).toBe(true);
    expect(canRetry("busy")).toBe(true);
    expect(canRetry("insecure")).toBe(false);
    expect(canRetry("unsupported")).toBe(false);
  });
});

describe("checkContact", () => {
  it("passes a name and an email", () => {
    expect(checkContact("Jane Doe", "jane@example.com")).toEqual({});
    expect(checkContact("  Jane ", " jane@example.com ")).toEqual({});
  });

  it("requires both", () => {
    expect(checkContact("", "")).toEqual({
      name: expect.any(String),
      email: expect.any(String),
    });
    expect(checkContact("   ", "jane@example.com").name).toBeDefined();
  });

  it("rejects bad emails and long values", () => {
    expect(checkContact("Jane", "jane@").email).toBeDefined();
    expect(checkContact("Jane", "jane example.com").email).toBeDefined();
    expect(checkContact("Jane", `${"a".repeat(250)}@x.co`).email).toBeDefined();
    expect(checkContact("J".repeat(101), "jane@example.com").name).toBeDefined();
  });
});

describe("sendFailure", () => {
  it("handles no response", () => {
    expect(sendFailure("network", null)).toMatchObject({ offerEmail: false });
  });

  it("points to email when the endpoint is off or unconfigured", () => {
    expect(sendFailure(404, null).offerEmail).toBe(true);
    expect(sendFailure(503, { ok: false, error: "unavailable" }).offerEmail).toBe(true);
  });

  it("says when to retry after the limit", () => {
    const failure = sendFailure(429, { ok: false, error: "rate_limited", retryAfter: 125 });
    expect(failure.message).toContain("3 min");
  });

  it("hands field errors back to the form", () => {
    const failure = sendFailure(400, {
      ok: false,
      error: "invalid",
      fields: { email: "Enter a valid email." },
    });
    expect(failure.fields).toEqual({ name: undefined, email: "Enter a valid email." });
    expect(failure.offerEmail).toBe(false);
  });

  it("falls back to a generic retry", () => {
    expect(sendFailure(502, { ok: false, error: "upstream" }).message).toMatch(/couldn't send/i);
    expect(sendFailure(500, null).offerEmail).toBe(true);
  });
});
