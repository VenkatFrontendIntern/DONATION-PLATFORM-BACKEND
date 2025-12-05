import { Request, Response } from 'express';
import { Campaign } from '../models/Campaign.model.js';
import { Donation } from '../models/Donation.model.js';
import { User } from '../models/User.model.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * Get public platform statistics
 * This endpoint is public and doesn't require authentication
 */
export const getPublicStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalCampaigns,
      totalDonations,
      totalAmount,
      uniqueDonors,
    ] = await Promise.all([
      User.countDocuments(),
      Campaign.countDocuments({ status: 'approved' }),
      Donation.countDocuments({ status: 'success' }),
      Donation.aggregate([
        { $match: { status: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      // Count unique donors (both registered and anonymous)
      Donation.distinct('donorEmail', { status: 'success' }).then(emails => emails.length),
    ]);

    sendSuccess(
      res,
      {
        totalUsers,
        totalCampaigns,
        totalDonations,
        totalAmount: totalAmount[0]?.total || 0,
        uniqueDonors,
      },
      'Public stats retrieved successfully',
      200
    );
  } catch (error: any) {
    logger.error('Get public stats error:', error);
    sendError(res, 'Server error', 500, error);
  }
};

