import express, { Router } from 'express';
import { getPublicStats } from '../controllers/stats.controller.js';

const router: Router = express.Router();

// Public stats endpoint - no authentication required
router.get('/', getPublicStats);

export default router;

