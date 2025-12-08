import { uploadToCloudinary, extractPublicIdFromUrl, deleteFromCloudinary } from './cloudinary.service.js';
import { logger } from '../utils/logger.js';

/**
 * Upload cover image to Cloudinary
 */
export const uploadCoverImage = async (file: Express.Multer.File): Promise<string> => {
  return await uploadToCloudinary(file);
};

/**
 * Upload gallery images to Cloudinary
 */
export const uploadGalleryImages = async (files: Express.Multer.File[]): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadToCloudinary(file);
    urls.push(url);
  }
  return urls;
};

/**
 * Upload videos to Cloudinary
 */
export const uploadVideos = async (files: Express.Multer.File[]): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadToCloudinary(file, 'video');
    urls.push(url);
  }
  return urls;
};

/**
 * Delete media files from Cloudinary
 */
export const deleteMediaFiles = async (urls: string[]): Promise<void> => {
  for (const url of urls) {
    try {
      const mediaData = extractPublicIdFromUrl(url);
      if (mediaData) {
        await deleteFromCloudinary(mediaData.publicId, mediaData.resourceType);
        logger.info(`Deleted ${mediaData.resourceType} from Cloudinary: ${mediaData.publicId}`);
      } else {
        logger.warn(`Could not extract public ID from URL: ${url}`);
      }
    } catch (error: any) {
      logger.error(`Error deleting media file ${url}:`, error);
    }
  }
};

