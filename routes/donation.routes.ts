import express, { Router } from 'express';
import {
  createOrder,
  verifyPayment,
  getCertificate,
  getMyDonations,
  getCampaignDonations,
} from '../controllers/donation.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { optionalAuth } from '../middlewares/optionalAuth.middleware.js';
import { donationLimiter } from '../middlewares/rateLimiter.js';

const router: Router = express.Router();

router.post('/create-order', authenticate, donationLimiter, createOrder);
router.post('/verify', authenticate, donationLimiter, verifyPayment);
router.get('/certificate/:id', authenticate, getCertificate);
router.get('/my-donations', authenticate, getMyDonations);
router.get('/campaign/:campaignId', optionalAuth, getCampaignDonations);

export default router;

