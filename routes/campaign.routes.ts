import express, { Router } from 'express';
import {
  getAllCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  getMyCampaigns,
  getCategories,
} from '../controllers/campaign.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { uploadMultiple } from '../middlewares/upload.middleware.js';

const router: Router = express.Router();

router.get('/', getAllCampaigns);
router.get('/categories', getCategories);
router.get('/my-campaigns', authenticate, getMyCampaigns);
router.get('/:id', getCampaignById);
router.post('/', authenticate, uploadMultiple, createCampaign);
router.put('/:id', authenticate, uploadMultiple, updateCampaign);
router.delete('/:id', authenticate, deleteCampaign);

export default router;

