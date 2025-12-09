import { Request, Response } from 'express';
import { Campaign } from '../../models/Campaign.model.js';
import { Donation } from '../../models/Donation.model.js';
import { User } from '../../models/User.model.js';
import { logger } from '../../utils/logger.js';
import { sendSuccess, sendError } from '../../utils/apiResponse.js';

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

