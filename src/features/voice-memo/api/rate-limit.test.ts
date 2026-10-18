import { describe, expect, it } from "vitest";
import { clientKey, createRateLimiter } from "./rate-limit";

function clock(start = 0) {
  let t = start;
  return { now: () => t, advance: (ms: number) => (t += ms) };
}

describe("createRateLimiter", () => {
  it("allows `limit` sends per window, then reports when to retry", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 3, windowMs: 600_000, now: time.now });
    expect(limiter.take("a")).toEqual({ ok: true });
    time.advance(60_000);
    expect(limiter.take("a")).toEqual({ ok: true });
    expect(limiter.take("a")).toEqual({ ok: true });
    // The first send expires 9 minutes from now.
    expect(limiter.take("a")).toEqual({ ok: false, retryAfter: 540 });
    expect(limiter.peek("a")).toEqual({ ok: false, retryAfter: 540 });
  });

  it("keeps visitors apart", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
    expect(limiter.take("b").ok).toBe(true);
  });

  it("slides: old sends fall out of the window", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: time.now });
    limiter.take("a");
    time.advance(500);
    limiter.take("a");
    expect(limiter.take("a").ok).toBe(false);
    time.advance(500); // the first send is now exactly 1000 ms old
    expect(limiter.take("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(false);
  });

  it("peek counts nothing", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    for (let i = 0; i < 5; i++) expect(limiter.peek("a").ok).toBe(true);
    expect(limiter.take("a").ok).toBe(true);
  });

  it("release gives the last send back", () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    limiter.take("a");
    limiter.release("a");
    expect(limiter.take("a").ok).toBe(true);
    limiter.release("nobody"); // no-op
  });

  it("retryAfter is at least a second", () => {
    const time = clock();
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: time.now });
    limiter.take("a");
    time.advance(999.5);
    expect(limiter.take("a")).toEqual({ ok: false, retryAfter: 1 });
  });
});

describe("clientKey", () => {
  const req = (headers: Record<string, string>) => new Request("http://x.test", { headers });

  it("takes the first x-forwarded-for address", () => {
    expect(clientKey(req({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }))).toBe("203.0.113.7");
  });

  it("falls back to x-real-ip, then a shared bucket", () => {
    expect(clientKey(req({ "x-real-ip": "198.51.100.2" }))).toBe("198.51.100.2");
    expect(clientKey(req({}))).toBe("unknown");
  });
});
