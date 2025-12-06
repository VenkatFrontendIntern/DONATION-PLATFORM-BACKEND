import { Request, Response } from 'express';
import { Campaign, ICampaign } from '../models/Campaign.model.js';
import { Category } from '../models/Category.model.js';
import { uploadToCloudinary, deleteFromCloudinary, extractPublicIdFromUrl } from '../services/cloudinary.service.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';

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

    // Validate and parse pagination parameters
    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10)); // Max 100, min 1

    const campaigns = await Campaign.find(query)
      .select('title description organizer goalAmount raisedAmount category coverImage status endDate donorCount createdAt')
      .populate('category', 'name slug')
      .populate('organizerId', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .lean();

    const total = await Campaign.countDocuments(query);
    const pages = Math.ceil(total / limitNum);

    sendPaginated(
      res,
      campaigns,
      {
        page: pageNum,
        limit: limitNum,
        total,
        pages,
      },
      'Campaigns retrieved successfully'
    );
  } catch (error: any) {
    logger.error('Get campaigns error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const getCampaignById = async (req: Request, res: Response): Promise<void> => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('category', 'name slug')
      .populate('organizerId', 'name email avatar');

    if (!campaign) {
      sendError(res, 'Campaign not found', 404);
      return;
    }

    // Increment views
    campaign.views += 1;
    await campaign.save();

    sendSuccess(res, { campaign }, 'Campaign retrieved successfully');
  } catch (error: any) {
    logger.error('Get campaign error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const createCampaign = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const coverImageFile = files?.image?.[0];
    const galleryFiles = files?.images || [];

    if (!coverImageFile) {
      sendError(res, 'Cover image is required', 400);
      return;
    }

    // Upload cover image directly from buffer to Cloudinary
    const coverImageUrl = await uploadToCloudinary(coverImageFile);

    // Upload gallery images directly from buffer to Cloudinary
    const galleryImageUrls: string[] = [];
    for (const file of galleryFiles) {
      const url = await uploadToCloudinary(file);
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

    sendSuccess(res, { campaign }, 'Campaign created successfully', 201);
  } catch (error: any) {
    logger.error('Create campaign error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const updateCampaign = async (req: Request, res: Response): Promise<void> => {
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

    // Check if user owns the campaign
    if (campaign.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      logger.warn(`Authorization failed: User ${req.user._id} attempted to update campaign ${req.params.id} owned by ${campaign.organizerId}`);
      sendError(res, 'You are not authorized to update this campaign. Only the campaign organizer or an admin can update it.', 403);
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = { ...req.body };

    if (files?.image?.[0]) {
      updateData.coverImage = await uploadToCloudinary(files.image[0]);
    }

    if (files?.images) {
      const galleryImageUrls: string[] = [];
      for (const file of files.images) {
        const url = await uploadToCloudinary(file);
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

    sendSuccess(res, { campaign: updatedCampaign }, 'Campaign updated successfully');
  } catch (error: any) {
    logger.error('Update campaign error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const deleteCampaign = async (req: Request, res: Response): Promise<void> => {
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

    // Check if user owns the campaign or is admin
    if (campaign.organizerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      logger.warn(`Authorization failed: User ${req.user._id} attempted to delete campaign ${req.params.id} owned by ${campaign.organizerId}`);
      sendError(res, 'You are not authorized to delete this campaign. Only the campaign organizer or an admin can delete it.', 403);
      return;
    }

    // Delete images from Cloudinary before deleting the campaign
    try {
      // Delete cover image
      if (campaign.coverImage) {
        const coverImagePublicId = extractPublicIdFromUrl(campaign.coverImage);
        if (coverImagePublicId) {
          await deleteFromCloudinary(coverImagePublicId);
          logger.info(`Deleted cover image from Cloudinary: ${coverImagePublicId}`);
        } else {
          logger.warn(`Could not extract public ID from cover image URL: ${campaign.coverImage}`);
        }
      }

      // Delete gallery images
      if (campaign.galleryImages && campaign.galleryImages.length > 0) {
        for (const imageUrl of campaign.galleryImages) {
          const galleryImagePublicId = extractPublicIdFromUrl(imageUrl);
          if (galleryImagePublicId) {
            await deleteFromCloudinary(galleryImagePublicId);
            logger.info(`Deleted gallery image from Cloudinary: ${galleryImagePublicId}`);
          } else {
            logger.warn(`Could not extract public ID from gallery image URL: ${imageUrl}`);
          }
        }
      }
    } catch (cloudinaryError: any) {
      // Log the error but don't fail the campaign deletion
      // This ensures the campaign is deleted even if Cloudinary deletion fails
      logger.error('Error deleting images from Cloudinary:', cloudinaryError);
    }

    // Delete the campaign from database
    await Campaign.findByIdAndDelete(req.params.id);

    sendSuccess(res, null, 'Campaign deleted successfully');
  } catch (error: any) {
    logger.error('Delete campaign error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const getMyCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, 'Authentication required', 401);
      return;
    }

    const campaigns = await Campaign.find({ organizerId: req.user._id })
      .select('title description organizer goalAmount raisedAmount category coverImage status endDate donorCount createdAt')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, { campaigns }, 'Campaigns retrieved successfully');
  } catch (error: any) {
    logger.error('Get my campaigns error:', error);
    sendError(res, undefined, 500, error);
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Category.find({ isActive: true }).select('name slug').sort({ name: 1 }).lean();

    sendSuccess(res, { categories }, 'Categories retrieved successfully');
  } catch (error: any) {
    logger.error('Get categories error:', error);
    sendError(res, undefined, 500, error);
  }
};

