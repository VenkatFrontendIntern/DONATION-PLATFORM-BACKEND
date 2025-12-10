import { Request, Response } from 'express';
import mongoose from 'mongoose';
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
    // Check if database is connected
    if (mongoose.connection.readyState !== 1) {
      logger.warn('Database not connected for stats request, returning default values');
      // Return default values instead of error to prevent 500 on initial load
      sendSuccess(
        res,
        {
          totalUsers: 0,
          totalCampaigns: 0,
          totalDonations: 0,
          totalAmount: 0,
          uniqueDonors: 0,
        },
        'Public stats retrieved successfully (default values)',
        200
      );
      return;
    }

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
    
    // If it's a database connection error, return default values instead of 500
    if (error.name === 'MongoServerError' || error.message?.includes('connection') || error.message?.includes('timeout')) {
      logger.warn('Database connection error for stats, returning default values');
      sendSuccess(
        res,
        {
          totalUsers: 0,
          totalCampaigns: 0,
          totalDonations: 0,
          totalAmount: 0,
          uniqueDonors: 0,
        },
        'Public stats retrieved successfully (default values)',
        200
      );
      return;
    }
    
    sendError(res, 'Server error', 500, error);
  }
};

