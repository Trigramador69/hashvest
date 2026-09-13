/**
 * Cost guardrails for the AI draft endpoint (HAS-16).
 *
 * Two fixed windows per wallet: a short one that stops a stuck client from
 * hammering a paid API, and a daily one that bounds what a single session can
 * spend. The clock is injected so the behaviour is testable without waiting.
 *
 * Deliberately in-process. Retention is zero — nothing about a request is
 * written to Supabase, not even a counter — so the limiter cannot be shared
 * across instances, and a horizontally scaled deployment enforces the cap per
 * instance rather than per wallet. That trade is stated in
 * docs/ai-grant-builder.md; a shared limiter would mean persisting per-wallet
 * request history, which is exactly what the privacy boundary rules out.
 */

export const AI_REQUESTS_PER_MINUTE = 5;
export const AI_REQUESTS_PER_DAY = 40;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Above this many tracked wallets, expired entries are swept on write. */
const SWEEP_THRESHOLD = 1_000;

export type RateLimitDecision =
  { allowed: true } | { allowed: false; retryAfterSeconds: number };

type Window = { start: number; count: number };
type Entry = { minute: Window; day: Window };

export type AiRateLimiter = {
  consume(key: string, now: number): RateLimitDecision;
  /** Test seam: forget everything. Never called in product code. */
  reset(): void;
};

function hit(window: Window, now: number, span: number, limit: number): number {
  if (now - window.start >= span) {
    window.start = now;
    window.count = 0;
  }
  if (window.count >= limit)
    return Math.max(1, Math.ceil((window.start + span - now) / 1000));
  window.count += 1;
  return 0;
}

export function createAiRateLimiter(
  limits: { perMinute?: number; perDay?: number } = {},
): AiRateLimiter {
  const perMinute = limits.perMinute ?? AI_REQUESTS_PER_MINUTE;
  const perDay = limits.perDay ?? AI_REQUESTS_PER_DAY;
  const entries = new Map<string, Entry>();

  return {
    consume(key, now) {
      if (entries.size > SWEEP_THRESHOLD)
        for (const [tracked, entry] of entries)
          if (now - entry.day.start >= DAY_MS) entries.delete(tracked);

      let entry = entries.get(key);
      if (!entry) {
        entry = {
          minute: { start: now, count: 0 },
          day: { start: now, count: 0 },
        };
        entries.set(key, entry);
      }

      // The day window is checked first so a wallet that exhausted its daily
      // budget is told the real wait rather than a misleading sixty seconds.
      const dayWait = hit(entry.day, now, DAY_MS, perDay);
      if (dayWait) return { allowed: false, retryAfterSeconds: dayWait };

      const minuteWait = hit(entry.minute, now, MINUTE_MS, perMinute);
      if (minuteWait) {
        // The daily budget was spent on a request that is not being served.
        entry.day.count -= 1;
        return { allowed: false, retryAfterSeconds: minuteWait };
      }
      return { allowed: true };
    },
    reset() {
      entries.clear();
    },
  };
}

/** The limiter the route handler shares across requests in one instance. */
export const aiRateLimiter = createAiRateLimiter();
