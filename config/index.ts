import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

// MongoDB Connection - optimized for serverless (Vercel)
let cachedConnection: typeof mongoose | null = null;

export const connectDB = async (): Promise<void> => {
  try {
    // Reuse existing connection if available (important for serverless)
    if (cachedConnection && mongoose.connection.readyState === 1) {
      console.log('Using existing MongoDB connection');
      return;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/donation-platform';
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI is not defined');
    }

    // Close existing connection if it exists but is not ready
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }

    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });
    
    cachedConnection = conn;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    // Don't exit in serverless environment - let Vercel handle it
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    throw error;
  }
};

// Environment variables configuration
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

