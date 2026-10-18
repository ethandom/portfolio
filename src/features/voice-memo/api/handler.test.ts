import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { VoiceMemoResponse } from "../lib/limits";
import type { VoiceMemoEnv } from "./env";
import { handleVoiceMemo, type Deps } from "./handler";
import { createRateLimiter } from "./rate-limit";
import { RESEND_ENDPOINT, type ResendEmail } from "./resend";
import { memoForm } from "./test-fixtures";

const URL_ = "http://localhost:3000/api/voice-memo";

function request(form = memoForm(), headers: Record<string, string> = {}) {
  return new Request(URL_, {
    method: "POST",
    body: form,
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "x-forwarded-for": "203.0.113.7",
      ...headers,
    },
  });
}

function setup(env: VoiceMemoEnv, resend: () => Response | Promise<Response> = () => Response.json({ id: "1" })) {
  const fetchMock = vi.fn<typeof fetch>(async () => resend());
  const log = { info: vi.fn(), error: vi.fn() };
  const deps: Partial<Deps> = {
    env,
    fetch: fetchMock as unknown as typeof fetch,
    now: () => new Date("2026-10-17T18:32:00Z"),
    limiter: createRateLimiter({ limit: 3, windowMs: 600_000 }),
    log,
  };
  const call = (req = request()) => handleVoiceMemo(req, deps);
  return { call, fetchMock, log };
}

const json = async (res: Response) => (await res.json()) as VoiceMemoResponse;

const DEV = { NODE_ENV: "development" } satisfies VoiceMemoEnv;
const PROD = { NODE_ENV: "production", VOICE_MEMO_ENABLED: "1" } satisfies VoiceMemoEnv;
const KEY = { RESEND_API_KEY: "re_test_key" };

beforeEach(() => {
  // Nothing in these tests may reach the network, Resend least of all.
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("real fetch called in a test");
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("gate", () => {
  it("404s in production without VOICE_MEMO_ENABLED", async () => {
    for (const flag of [undefined, "", "0", "yes"]) {
      const { call, fetchMock } = setup({ NODE_ENV: "production", VOICE_MEMO_ENABLED: flag, ...KEY });
      const res = await call();
      expect(res.status).toBe(404);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it("opens in production with VOICE_MEMO_ENABLED=1", async () => {
    const { call, fetchMock } = setup({ ...PROD, ...KEY });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true, delivered: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("is always open in development", async () => {
    const { call } = setup(DEV);
    expect((await call()).status).toBe(200);
  });
});

describe("without RESEND_API_KEY", () => {
  it("dry-runs in development: success, not delivered, one log line without personal data", async () => {
    const { call, fetchMock, log } = setup(DEV);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true, delivered: false });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledTimes(1);
    const line = String(log.info.mock.calls[0][0]);
    expect(line).toMatch(/dry run/);
    expect(line).not.toContain("Jane");
    expect(line).not.toContain("jane@example.com");
  });

  it("answers 503 in production and logs no personal data", async () => {
    const { call, fetchMock, log } = setup(PROD);
    const res = await call();
    expect(res.status).toBe(503);
    expect(await json(res)).toEqual({ ok: false, error: "unavailable" });
    expect(fetchMock).not.toHaveBeenCalled();
    const logged = JSON.stringify([log.info.mock.calls, log.error.mock.calls]);
    expect(logged).not.toContain("Jane");
    expect(logged).not.toContain("jane@example.com");
  });
});

describe("sending", () => {
  it("emails the memo through Resend with reply_to set to the sender", async () => {
    const { call, fetchMock } = setup({
      ...DEV,
      ...KEY,
      VOICE_MEMO_FROM: "Memos <memos@example.test>",
      VOICE_MEMO_TO: "inbox@example.test",
    });
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(RESEND_ENDPOINT);
    const body = JSON.parse(init.body as string) as ResendEmail;
    expect(body).toMatchObject({
      from: "Memos <memos@example.test>",
      to: ["inbox@example.test"],
      reply_to: "jane@example.com",
      subject: "Voice memo from Jane Doe",
    });
    expect(body.attachments[0].filename).toBe("voice-memo-2026-10-17-1432.webm");
  });

  it("defaults the sender and inbox to the site's domain", async () => {
    const { call, fetchMock } = setup({ ...DEV, ...KEY });
    await call();
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.from).toBe("Workbench <memos@ethanaustincruse.com>");
    expect(body.to).toEqual(["contact@ethanaustincruse.com"]);
  });

  it("answers 502 when Resend fails, logs only the status, and gives the send back", async () => {
    const { call, log } = setup({ ...PROD, ...KEY }, () =>
      Response.json({ message: "nope" }, { status: 500 }),
    );
    for (let i = 0; i < 4; i++) {
      const res = await call();
      expect(res.status).toBe(502);
      expect(await json(res)).toEqual({ ok: false, error: "upstream" });
    }
    expect(String(log.error.mock.calls[0][0])).toMatch(/status 500/);
    expect(JSON.stringify(log.error.mock.calls)).not.toContain("jane@example.com");
  });
});

describe("abuse", () => {
  it("answers a filled honeypot as a success and sends nothing", async () => {
    const { call, fetchMock } = setup({ ...PROD, ...KEY });
    const res = await call(request(memoForm({ website: "https://spam.example" })));
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ ok: true, delivered: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("limits each visitor to 3 memos per 10 minutes", async () => {
    const { call, fetchMock } = setup({ ...DEV, ...KEY });
    for (let i = 0; i < 3; i++) expect((await call()).status).toBe(200);
    const res = await call();
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await json(res)).toMatchObject({ ok: false, error: "rate_limited" });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    // Another visitor is unaffected.
    expect((await call(request(memoForm(), { "x-forwarded-for": "198.51.100.9" }))).status).toBe(200);
  });

  it("doesn't count invalid submissions against the limit", async () => {
    const { call } = setup(DEV);
    for (let i = 0; i < 5; i++) {
      expect((await call(request(memoForm({ email: "nope" })))).status).toBe(400);
    }
    expect((await call()).status).toBe(200);
  });

  it("rejects posts from another site's page", async () => {
    const { call, fetchMock } = setup({ ...DEV, ...KEY });
    const res = await call(request(memoForm(), { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized body before reading it", async () => {
    const { call } = setup(DEV);
    const res = await call(request(memoForm(), { "content-length": String(10 * 1024 * 1024) }));
    expect(res.status).toBe(413);
  });

  it("answers 400 for a body that isn't a form", async () => {
    const { call } = setup(DEV);
    const res = await call(
      new Request(URL_, {
        method: "POST",
        body: "{}",
        headers: { "content-type": "application/json" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("passes field errors back", async () => {
    const { call } = setup(DEV);
    const res = await call(request(memoForm({ name: "", email: "x" })));
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({
      ok: false,
      error: "invalid",
      fields: { name: expect.any(String), email: expect.any(String) },
    });
  });
});
