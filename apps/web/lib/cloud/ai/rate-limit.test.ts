import { describe, expect, it } from "vitest";

import {
  AI_REQUESTS_PER_DAY,
  AI_REQUESTS_PER_MINUTE,
  createAiRateLimiter,
} from "./rate-limit";

const MINUTE = 60_000;
const DAY = 24 * 60 * 60 * 1000;

describe("createAiRateLimiter", () => {
  it("allows a burst up to the per-minute cap and then refuses", () => {
    const limiter = createAiRateLimiter({ perMinute: 3 });
    for (let attempt = 0; attempt < 3; attempt += 1)
      expect(limiter.consume("wallet", 0)).toEqual({ allowed: true });

    const refused = limiter.consume("wallet", 0);
    expect(refused.allowed).toBe(false);
    expect(refused).toMatchObject({ retryAfterSeconds: 60 });
  });

  it("reports the wait left in the window, not the whole window", () => {
    const limiter = createAiRateLimiter({ perMinute: 1 });
    limiter.consume("wallet", 0);
    expect(limiter.consume("wallet", 45_000)).toMatchObject({
      retryAfterSeconds: 15,
    });
  });

  it("refills once the window has passed", () => {
    const limiter = createAiRateLimiter({ perMinute: 1 });
    limiter.consume("wallet", 0);
    expect(limiter.consume("wallet", MINUTE).allowed).toBe(true);
  });

  it("keeps wallets independent", () => {
    const limiter = createAiRateLimiter({ perMinute: 1 });
    limiter.consume("first", 0);
    expect(limiter.consume("second", 0).allowed).toBe(true);
    expect(limiter.consume("first", 0).allowed).toBe(false);
  });

  it("enforces a daily budget across many minutes", () => {
    const limiter = createAiRateLimiter({ perMinute: 1, perDay: 3 });
    for (let attempt = 0; attempt < 3; attempt += 1)
      expect(limiter.consume("wallet", attempt * MINUTE).allowed).toBe(true);

    const refused = limiter.consume("wallet", 3 * MINUTE);
    expect(refused.allowed).toBe(false);
    // A day, not a minute: telling them to retry in 60s would be a lie.
    expect(refused).toMatchObject({ retryAfterSeconds: 86_220 });
    expect(limiter.consume("wallet", DAY).allowed).toBe(true);
  });

  it("does not spend daily budget on a request the minute cap refused", () => {
    const limiter = createAiRateLimiter({ perMinute: 1, perDay: 2 });
    limiter.consume("wallet", 0);
    expect(limiter.consume("wallet", 0).allowed).toBe(false);
    expect(limiter.consume("wallet", MINUTE).allowed).toBe(true);
    expect(limiter.consume("wallet", 2 * MINUTE).allowed).toBe(false);
  });

  it("ships caps that leave room for a rehearsal but bound a paid API", () => {
    expect(AI_REQUESTS_PER_MINUTE).toBeGreaterThan(1);
    expect(AI_REQUESTS_PER_DAY).toBeGreaterThan(AI_REQUESTS_PER_MINUTE);
  });
});
