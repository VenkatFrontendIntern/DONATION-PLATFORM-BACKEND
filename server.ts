import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { connectDB, config } from './config/index.js';
import { ensureDBConnection } from './middlewares/db.middleware.js';
import { logger } from './utils/logger.js';
import { initializeAdmin } from './utils/initAdmin.js';
import { extractErrorMessage } from './utils/apiResponse.js';

import authRoutes from './routes/auth.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import donationRoutes from './routes/donation.routes.js';
import adminRoutes from './routes/admin.routes.js';
import upiRoutes from './routes/upi.routes.js';
import statsRoutes from './routes/stats.routes.js';
import newsletterRoutes from './routes/newsletter.routes.js';

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit in production, but log the error
  if (config.nodeEnv === 'production') {
    // In production, we might want to restart the process or alert monitoring
    // For now, just log it
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  // Exit process in production for uncaught exceptions
  if (config.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Initialize database connection
if (process.env.VERCEL !== '1') {
  connectDB()
    .then(() => {
      logger.info('Database connected successfully');
      initializeAdmin().catch((error) => {
        logger.error('Failed to initialize admin:', error);
      });
    })
    .catch((error) => {
      logger.error('Failed to connect to database:', error);
      // In production, we might want to retry or exit
      if (config.nodeEnv === 'production') {
        // Retry connection after delay
        setTimeout(() => {
          connectDB().catch((err) => {
            logger.error('Retry connection failed:', err);
            process.exit(1);
          });
        }, 5000);
      }
    });
}

const app = express();

// Trust proxy for Vercel/serverless environments
app.set('trust proxy', 1);

// Set request timeout (30 seconds)
app.use((req: Request, res: Response, next: NextFunction) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({ message: 'Request timeout' });
    }
  });
  next();
});

// Parse cookies
app.use(cookieParser());

const allowedOrigins = [
  config.frontendUrl || 'http://localhost:3000',
  'http://localhost:3000', // Vite dev server
  'http://localhost:4173', // Vite preview server
  'http://localhost:5173', // Alternative Vite port
  'https://donation-platform-frontend.vercel.app', // Production frontend
  'https://donation-platform-frontend-git-*.vercel.app',
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      return callback(null, true);
    }
    
    if (config.nodeEnv === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    if (origin && origin.includes('vercel.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/uploads', express.static('uploads'));

app.use('/api/', ensureDBConnection);

app.use('/api/auth', authRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/donation', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upi', upiRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/newsletter', newsletterRoutes);

app.get('/health', (req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: dbStatus,
    uptime: process.uptime()
  });
});

// 404 handler - must come before error handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ 
    status: 'error',
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler - must be last
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    query: req.query,
  });
  
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || extractErrorMessage(err) || 'Internal server error';
  
  const response: any = {
    status: 'error',
    message,
    data: null,
  };

  if (config.nodeEnv === 'development') {
    response.error = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }

  res.status(statusCode).json(response);
};
app.use(errorHandler);

if (process.env.VERCEL !== '1') {
  const PORT = config.port;

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${PORT} is already in use. Server may already be running.`);
      logger.info(`If you need to restart, stop the existing server first.`);
      return;
    } else {
      logger.error('Server error:', err);
      process.exit(1);
    }
  });

  // Graceful shutdown handlers
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      
      // Close database connection
      mongoose.connection.close(false, () => {
        logger.info('Database connection closed');
        process.exit(0);
      });
      
      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    });
  };

  // Handle different termination signals
  process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.once('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Handle nodemon restart (development)
  process.once('SIGUSR2', () => {
    server.close(() => {
      logger.info('Server closed for restart');
      process.kill(process.pid, 'SIGUSR2');
    });
  });
}

export default app;

