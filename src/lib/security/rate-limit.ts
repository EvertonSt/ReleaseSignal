// ── Rate Limiter ───────────────────────────────────────────────────────────
// Token bucket rate limiter for API endpoints.

interface Bucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  /** Maximum tokens (requests) allowed */
  maxTokens: number;
  /** Tokens refilled per second */
  refillRate: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxTokens: 60,
  refillRate: 1, // 1 request per second sustained
};

/** Check if a request is allowed under the rate limit */
export function checkRateLimit(
  key: string,
  config: Partial<RateLimitConfig> = {}
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket) {
    // First request — create bucket with full tokens
    buckets.set(key, { tokens: cfg.maxTokens - 1, lastRefill: now });
    return { allowed: true, remaining: cfg.maxTokens - 1 };
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refill = elapsed * cfg.refillRate;
  bucket.tokens = Math.min(cfg.maxTokens, bucket.tokens + refill);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }

  // Calculate retry-after
  const needed = 1 - bucket.tokens;
  const retryAfter = Math.ceil(needed / cfg.refillRate);

  return { allowed: false, remaining: 0, retryAfter };
}

/** Create rate limit headers for API responses */
export function rateLimitHeaders(key: string, config: Partial<RateLimitConfig> = {}): Record<string, string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const bucket = buckets.get(key);
  const remaining = bucket ? Math.floor(bucket.tokens) : cfg.maxTokens;

  return {
    "X-RateLimit-Limit": String(cfg.maxTokens),
    "X-RateLimit-Remaining": String(Math.max(0, remaining)),
    "X-RateLimit-Policy": `${cfg.maxTokens};w=1`,
  };
}

/** Clear all rate limit buckets (for testing) */
export function clearRateLimits(): void {
  buckets.clear();
}
