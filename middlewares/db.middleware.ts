import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { connectDB } from '../config/index.js';
import { logger } from '../utils/logger.js';

/**
 * Middleware to ensure database connection is established
 * Critical for Vercel serverless functions where connection might not persist
 */
export const ensureDBConnection = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Connection states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const readyState = mongoose.connection.readyState as number;
    
    // Check if connection is ready
    if (readyState === 1) {
      // Connection is ready
      next();
      return;
    }

    // Connection is not ready, attempt to connect
    if (readyState === 0) {
      // Not connected, try to connect with timeout
      // Use longer timeout for Vercel serverless (cold starts)
      const timeout = process.env.VERCEL === '1' ? 10000 : 5000;
      const connectPromise = connectDB();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), timeout)
      );
      
      try {
        await Promise.race([connectPromise, timeoutPromise]);
        next();
        return;
      } catch (connectError: any) {
        // If connection fails, check if it's a public endpoint that can handle it
        const isPublicEndpoint = req.path.includes('/stats') || 
                                req.path.includes('/auth/login') || 
                                req.path.includes('/auth/signup') ||
                                req.path.includes('/newsletter/subscribe');
        
        if (isPublicEndpoint) {
          // For public endpoints, allow request to proceed
          // The controller will handle the DB connection issue gracefully
          logger.warn(`Database connection failed for public endpoint ${req.path}, allowing request to proceed`);
          next();
          return;
        }
        
        // For protected endpoints, return 503
        throw connectError;
      }
    }

    // Connection is in a transitional state (connecting/disconnecting)
    // Wait a bit and check again (max 2 seconds for Vercel)
    let attempts = 0;
    const maxAttempts = process.env.VERCEL === '1' ? 20 : 10;
    
    while (attempts < maxAttempts && mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (mongoose.connection.readyState === 1) {
      next();
      return;
    }

    // Still not connected, try one more time with timeout
    const timeout = process.env.VERCEL === '1' ? 10000 : 5000;
    const connectPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), timeout)
    );
    
    try {
      await Promise.race([connectPromise, timeoutPromise]);
      next();
      return;
    } catch (connectError: any) {
      // If connection fails, check if it's a public endpoint that can handle it
      const isPublicEndpoint = req.path.includes('/stats') || 
                              req.path.includes('/auth/login') || 
                              req.path.includes('/auth/signup') ||
                              req.path.includes('/newsletter/subscribe');
      
      if (isPublicEndpoint) {
        // For public endpoints, allow request to proceed
        logger.warn(`Database connection failed for public endpoint ${req.path}, allowing request to proceed`);
        next();
        return;
      }
      
      // For protected endpoints, return 503
      throw connectError;
    }
  } catch (error: any) {
    logger.error('Database connection middleware error:', error);
    
    // Don't send response if headers already sent
    if (res.headersSent) {
      return;
    }
    
    // Check if it's a public endpoint that can handle the error
    const isPublicEndpoint = req.path.includes('/stats') || 
                            req.path.includes('/auth/login') || 
                            req.path.includes('/auth/signup') ||
                            req.path.includes('/newsletter/subscribe');
    
    if (isPublicEndpoint) {
      // For public endpoints, allow request to proceed even if DB connection fails
      // The controller will handle it gracefully
      logger.warn(`Allowing public endpoint ${req.path} to proceed despite DB connection error`);
      next();
      return;
    }
    
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed. Please try again later.',
      data: null,
    });
  }
};

