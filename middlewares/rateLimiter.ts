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

// Check if we're in development mode
const isDevelopment = process.env.NODE_ENV !== 'production';
// Allow disabling rate limiting entirely in development via environment variable
const disableRateLimit = isDevelopment && process.env.DISABLE_RATE_LIMIT === 'true';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 5000 : 200, // Very high limit in development (5000 requests per 15 min)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: 'draft-7', // Use draft-7 standard for rate limit headers
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting if disabled or for health checks and uploads
    if (disableRateLimit) return true;
    return req.path === '/health' || req.path.startsWith('/uploads');
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 500 : 5, // Much higher limit in development
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => disableRateLimit, // Skip if rate limiting is disabled
});

export const donationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many donation attempts, please try again later.',
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

