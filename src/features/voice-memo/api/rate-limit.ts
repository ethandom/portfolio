import "server-only";

export type RateCheck = { ok: true } | { ok: false; retryAfter: number };

export type RateLimiter = {
  /** Would one more send be allowed? Doesn't count anything. */
  peek(key: string): RateCheck;
  /** Counts a send if one is allowed. */
  take(key: string): RateCheck;
  /** Gives back the last send, for one that never went out (our failure, not theirs). */
  release(key: string): void;
};

/**
 * A sliding-window limit kept in memory. Best effort: each server instance
 * (each warm Vercel function) keeps its own count, and a cold start forgets
 * it, so this stops a visitor resending in a loop, not a determined sender.
 * The honeypot and the same-origin check do the rest.
 */
export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const hits = new Map<string, number[]>();

  /** The key's sends still inside the window, dropping the rest. */
  function recent(key: string, at: number): number[] {
    const list = (hits.get(key) ?? []).filter((t) => at - t < windowMs);
    if (list.length) hits.set(key, list);
    else hits.delete(key);
    return list;
  }

  function check(list: number[], at: number): RateCheck {
    if (list.length < limit) return { ok: true };
    return { ok: false, retryAfter: Math.max(1, Math.ceil((list[0] + windowMs - at) / 1000)) };
  }

  // Keeps the map from growing without bound on a long-lived instance.
  function sweep(at: number) {
    if (hits.size < 1000) return;
    for (const key of [...hits.keys()]) recent(key, at);
  }

  return {
    peek(key) {
      const at = now();
      return check(recent(key, at), at);
    },
    take(key) {
      const at = now();
      sweep(at);
      const list = recent(key, at);
      const result = check(list, at);
      if (result.ok) hits.set(key, [...list, at]);
      return result;
    },
    release(key) {
      const list = recent(key, now());
      list.pop();
      if (list.length) hits.set(key, list);
      else hits.delete(key);
    },
  };
}

/** The visitor's address. On Vercel the platform sets x-forwarded-for itself. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}
