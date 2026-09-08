import { Request, Response, NextFunction } from 'express';
import { createHttpError } from './errorHandler';

interface RateLimitBucket {
  count: number;
  resetTime: number;
}

const buckets = new Map<string, RateLimitBucket>();

const SWEEP_INTERVAL_MS = 60_000;

// Without eviction the map grows unbounded, one entry per client IP forever.
const sweepTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetTime) buckets.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweepTimer.unref();

function getClientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/** Fixed-window, in-memory limiter keyed by client IP. */
export function createRateLimiter(maxRequests = 60, windowMs = 60_000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = getClientKey(req);
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || now > bucket.resetTime) {
      buckets.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((bucket.resetTime - now) / 1000));
      return next(createHttpError('Too many requests. Please try again later.', 429, 'RATE_LIMITED'));
    }

    bucket.count += 1;
    next();
  };
}
