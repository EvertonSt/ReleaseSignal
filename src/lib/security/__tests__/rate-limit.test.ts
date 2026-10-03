import { describe, it, expect } from "vitest";
import { checkRateLimit, rateLimitHeaders, clearRateLimits } from "../rate-limit";

/*
 * The limiter keeps its buckets in a module-level Map and reads the clock
 * directly, so every test starts by clearing it and advances time with fake
 * timers. Without the reset a test would inherit the previous one's tokens and
 * fail only when the suite happened to run in a different order.
 */
describe("checkRateLimit", () => {
  it("allows the first request and reports the tokens left", () => {
    clearRateLimits();
    expect(checkRateLimit("ip:1")).toEqual({ allowed: true, remaining: 59 });
  });

  it("counts down to the limit and then refuses", () => {
    clearRateLimits();
    const config = { maxTokens: 3, refillRate: 0 };

    expect(checkRateLimit("ip:2", config)).toMatchObject({ allowed: true, remaining: 2 });
    expect(checkRateLimit("ip:2", config)).toMatchObject({ allowed: true, remaining: 1 });
    expect(checkRateLimit("ip:2", config)).toMatchObject({ allowed: true, remaining: 0 });

    const blocked = checkRateLimit("ip:2", config);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("keeps buckets independent per key", () => {
    clearRateLimits();
    const config = { maxTokens: 1, refillRate: 0 };

    expect(checkRateLimit("ip:a", config).allowed).toBe(true);
    expect(checkRateLimit("ip:a", config).allowed).toBe(false);
    // A different caller must not be punished for the first one's traffic.
    expect(checkRateLimit("ip:b", config).allowed).toBe(true);
  });

  it("refills over time and allows the request again", () => {
    clearRateLimits();
    const config = { maxTokens: 2, refillRate: 1 };
    vi.useFakeTimers();

    try {
      expect(checkRateLimit("ip:3", config).allowed).toBe(true);
      expect(checkRateLimit("ip:3", config).allowed).toBe(true);
      expect(checkRateLimit("ip:3", config).allowed).toBe(false);

      vi.advanceTimersByTime(1000);

      expect(checkRateLimit("ip:3", config).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("never refills past the ceiling", () => {
    clearRateLimits();
    const config = { maxTokens: 2, refillRate: 100 };
    vi.useFakeTimers();

    try {
      checkRateLimit("ip:4", config);
      vi.advanceTimersByTime(60_000);

      // 60s at 100/s would be 6000 tokens if the cap were missing.
      expect(checkRateLimit("ip:4", config).remaining).toBe(1);
      expect(checkRateLimit("ip:4", config).remaining).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("tells the caller how long to wait", () => {
    clearRateLimits();
    const config = { maxTokens: 1, refillRate: 1 };

    checkRateLimit("ip:5", config);
    const blocked = checkRateLimit("ip:5", config);

    expect(blocked.retryAfter).toBe(1);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });
});

describe("rateLimitHeaders", () => {
  it("reports the full allowance for a caller seen for the first time", () => {
    clearRateLimits();
    expect(rateLimitHeaders("ip:new", { maxTokens: 10 })).toEqual({
      "X-RateLimit-Limit": "10",
      "X-RateLimit-Remaining": "10",
      "X-RateLimit-Policy": "10;w=1",
    });
  });

  it("never reports a negative remaining count", () => {
    clearRateLimits();
    const config = { maxTokens: 1, refillRate: 0 };
    checkRateLimit("ip:6", config);
    checkRateLimit("ip:6", config);

    expect(rateLimitHeaders("ip:6", config)["X-RateLimit-Remaining"]).toBe("0");
  });
});

describe("clearRateLimits", () => {
  it("gives every caller a fresh allowance", () => {
    clearRateLimits();
    const config = { maxTokens: 1, refillRate: 0 };

    checkRateLimit("ip:7", config);
    expect(checkRateLimit("ip:7", config).allowed).toBe(false);

    clearRateLimits();
    expect(checkRateLimit("ip:7", config).allowed).toBe(true);
  });
});
