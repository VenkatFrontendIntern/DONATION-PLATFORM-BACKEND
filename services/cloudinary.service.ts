import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';

// Configure Cloudinary
if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

export const uploadToCloudinary = async (filePath: string): Promise<string> => {
  try {
    if (!config.cloudinary.cloudName) {
      // Fallback to local file path if Cloudinary not configured
      logger.warn('Cloudinary not configured, using local file path');
      return filePath;
    }

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'donation-platform',
      resource_type: 'auto',
    });

    // Delete local file after upload
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      logger.warn('Failed to delete local file:', err);
    }

    return result.secure_url;
  } catch (error: any) {
    logger.error('Cloudinary upload error:', error);
    // Fallback to local file path
    return filePath;
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    if (config.cloudinary.cloudName) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error: any) {
    logger.error('Cloudinary delete error:', error);
  }
};

