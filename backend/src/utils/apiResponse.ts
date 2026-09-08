import { Response } from 'express';

/** Success envelope: `{ data }`. */
export function sendData(res: Response, data: unknown, statusCode: number = 200): void {
  res.status(statusCode).json({ data });
}

/** Error envelope: `{ error: { message, code? } }`, matching the global error handler. */
export function sendError(res: Response, statusCode: number, message: string, code?: string): void {
  res.status(statusCode).json({ error: { message, ...(code ? { code } : {}) } });
}
