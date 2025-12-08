import express, { Router } from 'express';
import { 
  subscribeNewsletter, 
  unsubscribeNewsletter,
  sendNewsletterToSubscribers 
} from '../controllers/newsletter.controller.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();

// Newsletter routes (public, no auth required)
router.post('/subscribe', apiLimiter, subscribeNewsletter);
router.get('/unsubscribe', apiLimiter, unsubscribeNewsletter);

// Admin-only routes
router.post('/send', authenticate, authorize('admin'), apiLimiter, sendNewsletterToSubscribers);

export default router;

