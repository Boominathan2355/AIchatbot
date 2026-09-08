import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { sendError } from '../utils/apiResponse';

const ACCESS_TOKEN_TTL = '30d';
const BEARER_PREFIX = 'Bearer ';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

interface AccessTokenPayload {
  userId: string;
}

/** Rejects the request unless it carries a valid bearer token; sets `req.userId`. */
export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
    sendError(res, 401, 'No token provided', 'UNAUTHORIZED');
    return;
  }

  const token = authHeader.slice(BEARER_PREFIX.length);

  try {
    const payload = jwt.verify(token, config.jwtSecret) as AccessTokenPayload;
    req.userId = payload.userId;
    next();
  } catch {
    sendError(res, 401, 'Invalid token', 'UNAUTHORIZED');
  }
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: ACCESS_TOKEN_TTL });
}
