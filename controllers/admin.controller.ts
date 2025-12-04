import { Request, Response } from 'express';
import { Campaign } from '../models/Campaign.model.js';
import { Donation } from '../models/Donation.model.js';
import { User } from '../models/User.model.js';
import { Category } from '../models/Category.model.js';
import { logger } from '../utils/logger.js';

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

    res.json({
      success: true,
      campaigns,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages,
      },
    });
  } catch (error: any) {
    logger.error('Get pending campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const approveCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found' });
      return;
    }

    campaign.status = 'approved';
    campaign.approvedBy = req.user._id;
    campaign.approvedAt = new Date();
    await campaign.save();

    res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    logger.error('Approve campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const rejectCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { rejectionReason } = req.body;
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found' });
      return;
    }

    campaign.status = 'rejected';
    campaign.rejectionReason = rejectionReason || 'Campaign does not meet our guidelines';
    campaign.approvedBy = req.user._id;
    await campaign.save();

    res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    logger.error('Reject campaign error:', error);
    res.status(500).json({ message: 'Server error' });
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

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCampaigns,
        totalDonations,
        totalAmount: totalAmount[0]?.total || 0,
        pendingCampaigns,
        approvedCampaigns,
        rejectedCampaigns,
      },
    });
  } catch (error: any) {
    logger.error('Get stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const users = await User.find(query)
      .select('-password -refreshToken')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error: any) {
    logger.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
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

    res.json({
      success: true,
      donations,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error: any) {
    logger.error('Get all donations error:', error);
    res.status(500).json({ message: 'Server error' });
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

    res.status(201).json({
      success: true,
      category,
    });
  } catch (error: any) {
    logger.error('Create category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    res.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    logger.error('Get all categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
  try {
    await Category.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Category deleted',
    });
  } catch (error: any) {
    logger.error('Delete category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

