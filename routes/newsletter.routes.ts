import express, { Router } from 'express';
import { 
  subscribeNewsletter, 
  unsubscribeNewsletter,
  sendNewsletterToSubscribers 
} from '../controllers/newsletter.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();

// Newsletter routes (public, no auth required)
router.post('/subscribe', subscribeNewsletter);
router.get('/unsubscribe', unsubscribeNewsletter);

// Admin-only routes
router.post('/send', authenticate, authorize('admin'), sendNewsletterToSubscribers);

export default router;

