import { Throttle, SkipThrottle } from '@nestjs/throttler';

/**
 * Rate limiting decorators for different use cases
 */

/**
 * Strict rate limit for sensitive operations (auth, password reset)
 * 5 requests per minute
 */
export const ThrottleStrict = () =>
  Throttle({
    short: { ttl: 60000, limit: 5 },
    medium: { ttl: 60000, limit: 5 },
    long: { ttl: 60000, limit: 5 },
  });

/**
 * Standard rate limit for normal API operations
 * Uses default throttler configuration
 */
export const ThrottleStandard = () =>
  Throttle({
    short: { ttl: 1000, limit: 3 },
    medium: { ttl: 10000, limit: 20 },
    long: { ttl: 60000, limit: 100 },
  });

/**
 * Relaxed rate limit for read-heavy endpoints
 * 200 requests per minute
 */
export const ThrottleRelaxed = () =>
  Throttle({
    short: { ttl: 1000, limit: 10 },
    medium: { ttl: 10000, limit: 50 },
    long: { ttl: 60000, limit: 200 },
  });

/**
 * Very strict rate limit for login/registration to prevent brute force
 * 3 requests per 5 minutes
 */
export const ThrottleAuth = () =>
  Throttle({
    short: { ttl: 300000, limit: 3 },
    medium: { ttl: 300000, limit: 3 },
    long: { ttl: 300000, limit: 3 },
  });

/**
 * AI endpoints rate limit (expensive operations)
 * 10 requests per minute
 */
export const ThrottleAI = () =>
  Throttle({
    short: { ttl: 60000, limit: 10 },
    medium: { ttl: 60000, limit: 10 },
    long: { ttl: 60000, limit: 10 },
  });

/**
 * Skip rate limiting for this endpoint
 */
export { SkipThrottle };
