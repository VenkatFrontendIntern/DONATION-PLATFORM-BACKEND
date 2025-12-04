import express, { Router } from 'express';
import { generateQR } from '../controllers/upi.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();

router.post('/generate-qr', authenticate, generateQR);

export default router;

