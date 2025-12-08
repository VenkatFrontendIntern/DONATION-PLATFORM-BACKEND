import { Request, Response, NextFunction } from 'express';

/**
 * Rate limiter middleware - DISABLED
 * All rate limiting has been removed. These are no-op middlewares that do nothing.
 */

// No-op middleware that does nothing - rate limiting is completely disabled
const noOpMiddleware = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const apiLimiter = noOpMiddleware;
export const authLimiter = noOpMiddleware;
export const donationLimiter = noOpMiddleware;

