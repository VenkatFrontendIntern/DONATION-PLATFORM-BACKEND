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
      const connectPromise = connectDB();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      );
      
      await Promise.race([connectPromise, timeoutPromise]);
      next();
      return;
    }

    // Connection is in a transitional state (connecting/disconnecting)
    // Wait a bit and check again (max 1 second)
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts && mongoose.connection.readyState !== 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (mongoose.connection.readyState === 1) {
      next();
      return;
    }

    // Still not connected, try one more time with timeout
    const connectPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 5000)
    );
    
    await Promise.race([connectPromise, timeoutPromise]);
    next();
  } catch (error: any) {
    logger.error('Database connection middleware error:', error);
    
    // Don't send response if headers already sent
    if (res.headersSent) {
      return;
    }
    
    res.status(503).json({
      status: 'error',
      message: 'Database connection failed. Please try again later.',
      data: null,
    });
  }
};

