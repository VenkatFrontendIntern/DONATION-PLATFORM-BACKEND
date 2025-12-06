import express, { Router } from 'express';
import {
  signup,
  login,
  getMe,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router: Router = express.Router();

router.post('/signup', authLimiter, signup);
router.post('/login', authLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/forgot', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;

