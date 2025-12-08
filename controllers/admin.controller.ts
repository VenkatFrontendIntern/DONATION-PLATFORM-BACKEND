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
 * Get donation trends for the last 6 months
 */
export const getDonationTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    sixMonthsAgo.setDate(1); // Start of the month
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Generate array of last 6 months
    const months: Array<{ year: number; month: number; label: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        label: monthNames[date.getMonth()],
      });
    }

    // Get donation data grouped by month
    const donationTrends = await Donation.aggregate([
      {
        $match: {
          status: 'success',
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          totalAmount: { $sum: '$amount' },
          donationCount: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Map the aggregated data to months array
    const trendsData = months.map((monthInfo) => {
      const trend = donationTrends.find(
        (t) => t._id.year === monthInfo.year && t._id.month === monthInfo.month + 1 // MongoDB month is 1-indexed
      );
      return {
        month: monthInfo.label,
        amount: trend?.totalAmount || 0,
        donations: trend?.donationCount || 0,
      };
    });

    sendSuccess(
      res,
      {
        trends: trendsData,
      },
      'Donation trends retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get donation trends error:', error);
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

