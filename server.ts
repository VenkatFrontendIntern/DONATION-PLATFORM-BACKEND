import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectDB, config } from './config/index.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
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

if (process.env.VERCEL !== '1') {
  connectDB().then(() => {
    initializeAdmin();
  }).catch((error) => {
    logger.error('Failed to connect to database:', error);
  });
}

const app = express();

// Trust proxy for Vercel/serverless environments
// This ensures rate limiter and other middleware see the real client IP
app.set('trust proxy', 1);

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

app.use('/api/', apiLimiter);

app.use('/api/', ensureDBConnection);

app.use('/api/auth', authRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/donation', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upi', upiRoutes);
app.use('/api/stats', statsRoutes);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Error:', err);
  
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

app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

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

  process.once('SIGUSR2', () => {
    server.close(() => {
      logger.info('Server closed for restart');
      process.kill(process.pid, 'SIGUSR2');
    });
  });
}

export default app;

