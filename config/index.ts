import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

let cachedConnection: typeof mongoose | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    // If already connected, return early
    if (cachedConnection && mongoose.connection.readyState === 1) {
      return;
    }

    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    // Close existing connection if in transitional state
    if (mongoose.connection.readyState !== 0 && mongoose.connection.readyState !== 1) {
      try {
        await mongoose.connection.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }

    // Connect with proper timeout and retry settings
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10, // Maximum number of connections in the pool
      minPoolSize: 2, // Minimum number of connections in the pool
      retryWrites: true,
      w: 'majority',
    });
    
    cachedConnection = conn;
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.info('MongoDB reconnected');
    });
  } catch (error) {
    console.error('Database connection error:', error);
    // Don't exit in serverless environments
    if (process.env.VERCEL !== '1' && process.env.NODE_ENV === 'production') {
      // In production, log but don't exit immediately - let the app retry
      throw error;
    } else if (process.env.VERCEL !== '1') {
      // In development, exit on error
      process.exit(1);
    } else {
      // In serverless, throw to be handled by the caller
      throw error;
    }
  }
};

export interface Config {
  port: number;
  nodeEnv: string;
  jwtSecret?: string;
  jwtRefreshSecret?: string;
  jwtExpire: string;
  jwtRefreshExpire: string;
  razorpayKeyId?: string;
  razorpayKeySecret?: string;
  cloudinary: {
    cloudName?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  smtp: {
    host?: string;
    port?: string;
    user?: string;
    pass?: string;
  };
  frontendUrl: string;
  adminEmail: string;
  adminPassword: string;
}

export const config: Config = {
  port: Number(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  jwtRefreshExpire: process.env.JWT_REFRESH_EXPIRE || '30d',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@engalatrust.org',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
};

