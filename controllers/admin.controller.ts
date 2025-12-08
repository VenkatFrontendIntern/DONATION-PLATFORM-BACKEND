import { Request, Response } from 'express';
import { Campaign } from '../models/Campaign.model.js';
import { Donation } from '../models/Donation.model.js';
import { User } from '../models/User.model.js';
import { Category } from '../models/Category.model.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';
import { escapeRegex } from '../utils/escapeRegex.js';

export const getPendingCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status = 'pending', page = 1, limit = 10 } = req.query;

    const campaigns = await Campaign.find({ status })
      .populate('category', 'name slug')
      .populate('organizerId', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Campaign.countDocuments({ status });
    const pages = Math.ceil(total / Number(limit));

    sendPaginated(
      res,
      campaigns,
      {
        page: Number(page),
        limit: Number(limit),
        total,
        pages,
      },
      'Campaigns retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get pending campaigns error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const approveCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      sendError(res, 'Campaign not found', 404);
      return;
    }

    campaign.status = 'approved';
    campaign.approvedBy = req.user._id;
    campaign.approvedAt = new Date();
    await campaign.save();

    sendSuccess(res, { campaign }, 'Campaign approved successfully');
  } catch (error: any) {
    logger.error('Approve campaign error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const rejectCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const { rejectionReason } = req.body;
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      sendError(res, 'Campaign not found', 404);
      return;
    }

    campaign.status = 'rejected';
    campaign.rejectionReason = rejectionReason || 'Campaign does not meet our guidelines';
    campaign.approvedBy = req.user._id;
    await campaign.save();

    sendSuccess(res, { campaign }, 'Campaign rejected successfully');
  } catch (error: any) {
    logger.error('Reject campaign error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalCampaigns,
      totalDonations,
      totalAmount,
      pendingCampaigns,
      approvedCampaigns,
      rejectedCampaigns,
    ] = await Promise.all([
      User.countDocuments(),
      Campaign.countDocuments(),
      Donation.countDocuments({ status: 'success' }),
      Donation.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Campaign.countDocuments({ status: 'pending' }),
      Campaign.countDocuments({ status: 'approved' }),
      Campaign.countDocuments({ status: 'rejected' }),
    ]);

    sendSuccess(
      res,
      {
        stats: {
          totalUsers,
          totalCampaigns,
          totalDonations,
          totalAmount: totalAmount[0]?.total || 0,
          pendingCampaigns,
          approvedCampaigns,
          rejectedCampaigns,
        },
      },
      'Stats retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get stats error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

/**
 * Get payment method analytics - shows distribution of payment methods and their success rates
 */
export const getPaymentMethodAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get payment method distribution
    const paymentMethodStats = await Donation.aggregate([
      {
        $group: {
          _id: '$paymentMethod',
          totalAmount: { $sum: '$amount' },
          totalCount: { $sum: 1 },
          successCount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
          },
          failedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          pendingCount: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          successAmount: {
            $sum: { $cond: [{ $eq: ['$status', 'success'] }, '$amount', 0] }
          },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);

    // Get donation status breakdown
    const statusBreakdown = await Donation.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
        },
      },
    ]);

    // Calculate success rates
    const analytics = paymentMethodStats.map((method) => {
      const total = method.totalCount;
      const successRate = total > 0 ? ((method.successCount / total) * 100).toFixed(1) : '0';
      
      return {
        method: method._id || 'unknown',
        totalAmount: method.totalAmount || 0,
        totalCount: method.totalCount || 0,
        successCount: method.successCount || 0,
        failedCount: method.failedCount || 0,
        pendingCount: method.pendingCount || 0,
        successAmount: method.successAmount || 0,
        successRate: parseFloat(successRate),
      };
    });

    // Format status breakdown
    const statusData = statusBreakdown.reduce((acc, status) => {
      acc[status._id] = {
        count: status.count,
        amount: status.totalAmount,
      };
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    sendSuccess(
      res,
      {
        paymentMethods: analytics,
        statusBreakdown: statusData,
      },
      'Payment method analytics retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get payment method analytics error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query: any = {};

    if (search) {
      // Sanitize search input to prevent NoSQL injection and ReDoS attacks
      const sanitizedSearch = escapeRegex(String(search));
      query.$or = [
        { name: { $regex: sanitizedSearch, $options: 'i' } },
        { email: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    sendPaginated(
      res,
      users,
      {
        page: Number(page),
        limit: Number(limit),
        total,
        pages,
      },
      'Users retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get all users error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const getAllDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, campaignId } = req.query;
    const query: any = { status: 'success' };

    if (campaignId) {
      query.campaignId = campaignId;
    }

    const donations = await Donation.find(query)
      .populate('campaignId', 'title')
      .populate('donorId', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Donation.countDocuments(query);
    const pages = Math.ceil(total / Number(limit));

    sendPaginated(
      res,
      donations,
      {
        page: Number(page),
        limit: Number(limit),
        total,
        pages,
      },
      'Donations retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get all donations error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const createCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, icon } = req.body;

    const category = await Category.create({
      name,
      description,
      icon,
    });

    sendSuccess(res, { category }, 'Category created successfully', 201);
  } catch (error: any) {
    logger.error('Create category error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    sendSuccess(res, { categories }, 'Categories retrieved successfully');
  } catch (error: any) {
    logger.error('Get all categories error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await Category.findByIdAndDelete(req.params.id);

    sendSuccess(res, null, 'Category deleted successfully');
  } catch (error: any) {
    logger.error('Delete category error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

