import rateLimit from 'express-rate-limit';

/**
 * Rate limiter configuration for serverless/Vercel environments.
 * 
 * Note: express-rate-limit's memory store is weak in serverless environments
 * because each function invocation may have a separate memory space.
 * For production, consider using Redis or another distributed store.
 * 
 * The 'trust proxy' setting in server.ts ensures the limiter sees the real client IP
 * instead of the Vercel proxy IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: 'draft-7', // Use draft-7 standard for rate limit headers
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health' || req.path.startsWith('/uploads');
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

export const donationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many donation attempts, please try again later.',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

