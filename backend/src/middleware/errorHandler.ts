import { Request, Response, NextFunction } from 'express';
import { config } from '../config/environment';

export interface HttpError extends Error {
  statusCode?: number;
  code?: string;
}

export function createHttpError(message: string, statusCode: number = 500, code?: string): HttpError {
  const error = new Error(message) as HttpError;
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

export function errorHandler(error: HttpError, req: Request, res: Response, _next: NextFunction): void {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  console.error(`[error] ${req.method} ${req.path}:`, message);
  if (statusCode === 500 && !config.isProduction) {
    console.error(error.stack);
  }

  res.status(statusCode).json({
    error: {
      message,
      code: error.code || 'INTERNAL_ERROR',
      ...(!config.isProduction && { stack: error.stack }),
    },
  });
}
