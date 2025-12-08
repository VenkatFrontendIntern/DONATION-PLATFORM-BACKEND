import express, { Router } from 'express';
import {
  createOrder,
  verifyPayment,
  getCertificate,
  getMyDonations,
  getCampaignDonations,
  handleRazorpayWebhook,
} from '../controllers/donation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { optionalAuth } from '../middlewares/optionalAuth.middleware.js';

const router: Router = express.Router();

router.post('/create-order', authenticate, createOrder);
router.post('/verify', authenticate, verifyPayment);
router.post('/webhook', handleRazorpayWebhook); // No auth - uses signature verification
router.get('/certificate/:id', authenticate, getCertificate);
router.get('/my-donations', authenticate, getMyDonations);
router.get('/campaign/:campaignId', optionalAuth, getCampaignDonations);

export default router;

