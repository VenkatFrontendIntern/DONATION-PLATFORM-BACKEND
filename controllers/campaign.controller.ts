import { Request, Response } from 'express';
import { Campaign } from '../models/Campaign.model.js';
import { Category } from '../models/Category.model.js';
import { extractPublicIdFromUrl, deleteFromCloudinary } from '../services/cloudinary.service.js';
import { logger } from '../utils/logger.js';
import { sendSuccess, sendError, sendPaginated } from '../utils/apiResponse.js';
import { escapeRegex } from '../utils/escapeRegex.js';
import { uploadCoverImage, uploadGalleryImages, uploadVideos, deleteMediaFiles } from '../services/campaignMedia.service.js';

export const getAllCampaigns = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, category, search, page = 1, limit = 10 } = req.query;
    const query: any = {};

    if (status) {
      query.status = status;
    } else {
      query.status = 'approved';
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      const sanitizedSearch = escapeRegex(String(search));
      query.$or = [
        { title: { $regex: sanitizedSearch, $options: 'i' } },
        { description: { $regex: sanitizedSearch, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 10));

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
    const videoFiles = files?.videos || [];

    if (!coverImageFile) {
      sendError(res, 'Cover image is required', 400);
      return;
    }

    const coverImageUrl = await uploadCoverImage(coverImageFile);
    const galleryImageUrls = await uploadGalleryImages(galleryFiles);
    const videoUrls = await uploadVideos(videoFiles);

    const campaignData: any = {
      title: req.body.title,
      description: req.body.description,
      organizer: req.body.organizer,
      organizerId: req.user._id,
      goalAmount: Number(req.body.goalAmount),
      category: req.body.category,
      coverImage: coverImageUrl,
      galleryImages: galleryImageUrls,
      videos: videoUrls,
      endDate: req.body.endDate,
      status: 'pending',
    };

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

    // Robust ownership check: ensure both IDs are converted to strings for comparison
    const organizerIdStr = campaign.organizerId?.toString() || '';
    const userIdStr = req.user._id?.toString() || '';
    
    if (organizerIdStr !== userIdStr && req.user.role !== 'admin') {
      logger.warn(`Authorization failed: User ${userIdStr} attempted to update campaign ${req.params.id} owned by ${organizerIdStr}`);
      sendError(res, 'You are not authorized to update this campaign. Only the campaign organizer or an admin can update it.', 403);
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const updateData: any = { ...req.body };
    const oldMediaUrls: string[] = [];

    // If new cover image is provided, delete the old one from Cloudinary
    if (files?.image?.[0]) {
      if (campaign.coverImage) {
        oldMediaUrls.push(campaign.coverImage);
      }
      updateData.coverImage = await uploadCoverImage(files.image[0]);
    }

    // If new gallery images are provided, replace the old ones (delete old, save new)
    if (files?.images && files.images.length > 0) {
      if (campaign.galleryImages && campaign.galleryImages.length > 0) {
        oldMediaUrls.push(...campaign.galleryImages);
      }
      const galleryImageUrls = await uploadGalleryImages(files.images);
      updateData.galleryImages = galleryImageUrls; // Replace, don't append
    }

    // If new videos are provided, replace the old ones (delete old, save new)
    if (files?.videos && files.videos.length > 0) {
      if (campaign.videos && campaign.videos.length > 0) {
        oldMediaUrls.push(...campaign.videos);
      }
      const videoUrls = await uploadVideos(files.videos);
      updateData.videos = videoUrls; // Replace, don't append
    }

    if (updateData.goalAmount) {
      updateData.goalAmount = Number(updateData.goalAmount);
    }

    const updatedCampaign = await Campaign.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    // Delete old media files from Cloudinary after successful update
    // This saves storage space and prevents orphaned files
    if (oldMediaUrls.length > 0) {
      deleteMediaFiles(oldMediaUrls).catch((cloudinaryError: any) => {
        logger.error('Error deleting old media from Cloudinary (non-critical):', cloudinaryError);
        // Non-critical: don't fail the request if deletion fails
      });
    }

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

    // Robust ownership check: ensure both IDs are converted to strings for comparison
    const organizerIdStr = campaign.organizerId?.toString() || '';
    const userIdStr = req.user._id?.toString() || '';
    
    if (organizerIdStr !== userIdStr && req.user.role !== 'admin') {
      logger.warn(`Authorization failed: User ${userIdStr} attempted to delete campaign ${req.params.id} owned by ${organizerIdStr}`);
      sendError(res, 'You are not authorized to delete this campaign. Only the campaign organizer or an admin can delete it.', 403);
      return;
    }

    try {
      const mediaUrls: string[] = [];
      if (campaign.coverImage) mediaUrls.push(campaign.coverImage);
      if (campaign.galleryImages) mediaUrls.push(...campaign.galleryImages);
      if (campaign.videos) mediaUrls.push(...campaign.videos);
      
      if (mediaUrls.length > 0) {
        await deleteMediaFiles(mediaUrls);
      }
    } catch (cloudinaryError: any) {
      logger.error('Error deleting media from Cloudinary:', cloudinaryError);
    }

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

