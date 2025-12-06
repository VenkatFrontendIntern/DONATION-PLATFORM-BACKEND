import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Readable } from 'stream';

if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

export const uploadToCloudinary = async (file: Express.Multer.File): Promise<string> => {
  try {
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      logger.error('Cloudinary not configured! Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
      throw new Error('Cloudinary not configured');
    }

    if (!file.buffer) {
      throw new Error('File buffer is required. Make sure multer is using memory storage.');
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'donation-platform',
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload error:', error);
            reject(error);
          } else if (result) {
            logger.info(`Successfully uploaded to Cloudinary: ${result.secure_url}`);
            resolve(result.secure_url);
          } else {
            reject(new Error('Upload failed: No result from Cloudinary'));
          }
        }
      );

      const bufferStream = new Readable();
      bufferStream.push(file.buffer);
      bufferStream.push(null);
      bufferStream.pipe(uploadStream);
    });
  } catch (error: any) {
    logger.error('Cloudinary upload error:', error);
    throw error;
  }
};

export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    const uploadMatch = url.match(/\/image\/upload\/(.+)$/);
    if (!uploadMatch) return null;
    
    let pathAfterUpload = uploadMatch[1];
    
    pathAfterUpload = pathAfterUpload.replace(/^[^/]*(?:,[^/]*)*\//, '');
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
    
    return publicId || null;
  } catch (error: any) {
    logger.error('Error extracting public ID from URL:', error);
    return null;
  }
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    if (config.cloudinary.cloudName) {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`Successfully deleted from Cloudinary: ${publicId}`);
    }
  } catch (error: any) {
    logger.error(`Cloudinary delete error for public ID ${publicId}:`, error);
  }
};

