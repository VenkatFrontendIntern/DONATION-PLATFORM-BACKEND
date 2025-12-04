import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import cors from 'cors';
import { connectDB, config } from './config/index.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { logger } from './utils/logger.js';
import { initializeAdmin } from './utils/initAdmin.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import donationRoutes from './routes/donation.routes.js';
import adminRoutes from './routes/admin.routes.js';
import upiRoutes from './routes/upi.routes.js';

// Connect to MongoDB
connectDB().then(() => {
  // Initialize admin user after DB connection
  initializeAdmin();
});

const app = express();

// Middleware
// CORS configuration - allow multiple origins for development
const allowedOrigins = [
  config.frontendUrl || 'http://localhost:3000',
  'http://localhost:3000', // Vite dev server
  'http://localhost:4173', // Vite preview server
  'http://localhost:5173', // Alternative Vite port
];

// In development, allow any localhost port
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // In development, allow any localhost origin
    if (config.nodeEnv === 'development' && origin.includes('localhost')) {
      return callback(null, true);
    }
    
    // In production, check against allowed origins
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

// Serve uploaded files (for local development)
app.use('/uploads', express.static('uploads'));

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/campaign', campaignRoutes);
app.use('/api/donation', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upi', upiRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: err.stack }),
  });
};
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
});

// Only start the server if not running on Vercel
// Vercel will handle the serverless function invocation
if (process.env.VERCEL !== '1') {
  const PORT = config.port;

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
  });

  // Handle port already in use error gracefully
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn(`Port ${PORT} is already in use. Server may already be running.`);
      logger.info(`If you need to restart, stop the existing server first.`);
      // Don't exit - let the existing server continue running
      return;
    } else {
      logger.error('Server error:', err);
      process.exit(1);
    }
  });

  // Graceful shutdown for nodemon
  process.once('SIGUSR2', () => {
    server.close(() => {
      logger.info('Server closed for restart');
      process.kill(process.pid, 'SIGUSR2');
    });
  });
}

export default app;

