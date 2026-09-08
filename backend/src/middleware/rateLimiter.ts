import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

interface Bucket { count: number; resetTime: number }

const rateLimitStore = new Map<string, Bucket>();

const SWEEP_INTERVAL_MS = 60_000;

// Without eviction the map grows unbounded, one entry per client IP forever.
const sweep = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitStore) {
    if (now > bucket.resetTime) rateLimitStore.delete(key);
  }
}, SWEEP_INTERVAL_MS);
sweep.unref();

export function rateLimiter(maxRequests = 60, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      res.setHeader('Retry-After', Math.ceil((record.resetTime - now) / 1000));
      return next(createError('Too many requests. Please try again later.', 429, 'RATE_LIMITED'));
    }

    record.count++;
    next();
  };
}
