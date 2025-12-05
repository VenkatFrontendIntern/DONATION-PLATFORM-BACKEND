import express, { Router } from 'express';
import {
  getPendingCampaigns,
  approveCampaign,
  rejectCampaign,
  getStats,
  getAllUsers,
  getAllDonations,
  createCategory,
  getAllCategories,
  deleteCategory,
} from '../controllers/admin.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';

const router: Router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate);

// Allow all authenticated users to view categories
router.get('/categories', getAllCategories);

router.use(authorize('admin'));

router.get('/campaigns', getPendingCampaigns);
router.put('/campaign/:id/approve', approveCampaign);
router.put('/campaign/:id/reject', rejectCampaign);
router.get('/stats', getStats);
router.get('/users', getAllUsers);
router.get('/donations', getAllDonations);
router.post('/categories', createCategory);
router.delete('/categories/:id', deleteCategory);

export default router;

