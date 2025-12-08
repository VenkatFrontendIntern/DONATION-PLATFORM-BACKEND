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

const router: Router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authenticate, getMe);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/forgot', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;

