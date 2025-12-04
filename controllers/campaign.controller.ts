import { Request, Response } from 'express';
import { Campaign, ICampaign } from '../models/Campaign.model.js';
import { Category } from '../models/Category.model.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { logger } from '../utils/logger.js';

export const getAllCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    const query: any = {};

    if (status) {
      query.status = status;
    } else {
      query.status = 'approved'; // Only show approved campaigns by default
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const campaigns = await Campaign.find(query)
      .select('title description organizer goalAmount raisedAmount category coverImage status endDate donorCount createdAt')
      .populate('category', 'name slug')
      .populate('organizerId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await Campaign.countDocuments(query);

    res.json({
      success: true,
      campaigns,
      total,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error: any) {
    logger.error('Get campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCampaignById = async (req: Request, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('organizerId', 'name email avatar');

    if (!campaign) {
      res.status(404).json({ message: 'Campaign not found' });
      return;
    }

    // Increment views
    campaign.views += 1;
    await campaign.save();

    res.json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    logger.error('Get campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const createCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const coverImageFile = files?.image?.[0];
    const galleryFiles = files?.images || [];

    if (!coverImageFile) {
      res.status(400).json({ message: 'Cover image is required' });
      return;
    }

    // Upload cover image
    const coverImageUrl = await uploadToCloudinary(coverImageFile.path);

    // Upload gallery images
    const galleryImageUrls: string[] = [];
    for (const file of galleryFiles) {
      const url = await uploadToCloudinary(file.path);
      galleryImageUrls.push(url);
    }

    const campaignData: any = {
      title: req.body.title,
      description: req.body.description,
      organizer: req.body.organizer,
      organizerId: req.user._id,
      goalAmount: Number(req.body.goalAmount),
      category: req.body.category,
      coverImage: coverImageUrl,
      galleryImages: galleryImageUrls,
      endDate: req.body.endDate,
      status: 'pending',
    };

    // Add social media links if provided
    if (req.body.socialMedia) {
      campaignData.socialMedia = JSON.parse(req.body.socialMedia);
    } else {
      campaignData.socialMedia = {
        facebook: req.body['socialMedia[facebook]'] || null,
        instagram: req.body['socialMedia[instagram]'] || null,
        twitter: req.body['socialMedia[twitter]'] || null,
        linkedin: req.body['socialMedia[linkedin]'] || null,
        whatsapp: req.body['socialMedia[whatsapp]'] || null,
        youtube: req.body['socialMedia[youtube]'] || null,
      };
    }

    const campaign = await Campaign.create(campaignData);

    res.status(201).json({
      success: true,
      campaign,
    });
  } catch (error: any) {
    logger.error('Create campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateCampaign = async (req: Request, res: Response): Promise<void> => {
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

    // Check if user owns the campaign
    if (campaign.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = { ...req.body };

    if (files?.image?.[0]) {
      updateData.coverImage = await uploadToCloudinary(files.image[0].path);
    }

    if (files?.images) {
      const galleryImageUrls: string[] = [];
      for (const file of files.images) {
        const url = await uploadToCloudinary(file.path);
        galleryImageUrls.push(url);
      }
      updateData.galleryImages = [...(campaign.galleryImages || []), ...galleryImageUrls];
    }

    if (updateData.goalAmount) {
      updateData.goalAmount = Number(updateData.goalAmount);
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json({
      success: true,
      campaign: updatedCampaign,
    });
  } catch (error: any) {
    logger.error('Update campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteCampaign = async (req: Request, res: Response): Promise<void> => {
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

    // Check if user owns the campaign or is admin
    if (campaign.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    await Campaign.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Campaign deleted',
    });
  } catch (error: any) {
    logger.error('Delete campaign error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getMyCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const campaigns = await Campaign.find({ organizerId: req.user._id })
      .select('title description organizer goalAmount raisedAmount category coverImage status endDate donorCount createdAt')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      campaigns,
    });
  } catch (error: any) {
    logger.error('Get my campaigns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true }).select('name slug').sort({ name: 1 }).lean();

    res.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    logger.error('Get categories error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

