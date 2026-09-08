import { Request, Response, NextFunction } from 'express';

type AsyncRequestHandler<TRequest extends Request = Request> = (
  req: TRequest,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/** Forwards rejected promises from async route handlers to the error middleware. */
export function asyncHandler<TRequest extends Request = Request>(handler: AsyncRequestHandler<TRequest>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req as TRequest, res, next)).catch(next);
  };
}
