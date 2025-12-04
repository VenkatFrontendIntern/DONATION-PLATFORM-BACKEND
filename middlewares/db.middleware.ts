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
      // Not connected, try to connect
      await connectDB();
      next();
      return;
    }

    // Connection is in a transitional state (connecting/disconnecting)
    // Wait a bit and check again
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    if ((mongoose.connection.readyState as number) === 1) {
      next();
      return;
    }

    // Still not connected, try one more time
    await connectDB();
    next();
  } catch (error: any) {
    logger.error('Database connection middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

