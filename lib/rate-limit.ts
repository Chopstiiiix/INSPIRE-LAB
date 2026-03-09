/**
 * Simple in-memory rate limiter
 *
 * For production, consider using Redis-based rate limiting for multi-instance deployments.
 * This implementation is suitable for single-instance deployments and development.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds?: number;
}

/**
 * Check and consume a rate limit token
 *
 * @param key - Unique identifier for the rate limit (e.g., userId, IP)
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;

  let entry = rateLimitStore.get(key);

  // Reset if window expired
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Check if over limit
  if (entry.count >= config.limit) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return {
      success: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfterSeconds,
    };
  }

  // Consume a token
  entry.count++;

  return {
    success: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Create a rate limiter with preset configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  return {
    check: (key: string) => checkRateLimit(key, config),
    config,
  };
}

// =============================================================================
// Preset Rate Limiters
// =============================================================================

/** Rate limiter for token issuance: 10 requests per minute */
export const tokenRateLimiter = createRateLimiter({
  limit: 10,
  windowSeconds: 60,
});

/** Rate limiter for API endpoints: 60 requests per minute */
export const apiRateLimiter = createRateLimiter({
  limit: 60,
  windowSeconds: 60,
});

/** Rate limiter for auth endpoints: 5 requests per minute */
export const authRateLimiter = createRateLimiter({
  limit: 5,
  windowSeconds: 60,
});

/** Rate limiter for membership changes: 20 per minute */
export const membershipRateLimiter = createRateLimiter({
  limit: 20,
  windowSeconds: 60,
});

/** Rate limiter for video calls: 10 per minute */
export const videoCallRateLimiter = createRateLimiter({
  limit: 10,
  windowSeconds: 60,
});
