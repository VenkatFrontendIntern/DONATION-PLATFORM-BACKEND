import { Request, Response } from 'express';
import { Donation } from '../../models/Donation.model.js';
import { logger } from '../../utils/logger.js';
import { sendError, sendPaginated } from '../../utils/apiResponse.js';

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

