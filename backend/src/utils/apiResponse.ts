import { Response } from 'express';

export function sendSuccess(res: Response, data: any, statusCode: number = 200) {
  res.status(statusCode).json({ success: true, data });
}

export function sendError(res: Response, message: string, statusCode: number = 500, code?: string) {
  res.status(statusCode).json({
    success: false,
    error: { message, code },
  });
}
