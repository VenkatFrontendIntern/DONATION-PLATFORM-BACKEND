import { Request, Response } from 'express';
import { Campaign } from '../../models/Campaign.model.js';
import { logger } from '../../utils/logger.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/apiResponse.js';

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

