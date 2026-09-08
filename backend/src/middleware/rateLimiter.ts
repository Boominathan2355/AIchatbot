import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(maxRequests = 60, windowMs = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    const record = rateLimitStore.get(ip);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(ip, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return next(createError('Too many requests. Please try again later.', 429, 'RATE_LIMITED'));
    }

    record.count++;
    next();
  };
}
