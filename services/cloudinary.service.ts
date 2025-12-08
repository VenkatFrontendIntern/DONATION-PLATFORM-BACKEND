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

export const uploadToCloudinary = async (file: Express.Multer.File, resourceType: 'image' | 'video' | 'auto' = 'auto'): Promise<string> => {
  try {
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      logger.error('Cloudinary not configured! Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
      throw new Error('Cloudinary not configured');
    }

    if (!file.buffer) {
      throw new Error('File buffer is required. Make sure multer is using memory storage.');
    }

    // Auto-detect resource type if not specified
    const detectedResourceType = resourceType === 'auto' 
      ? (file.mimetype.startsWith('video/') ? 'video' : 'image')
      : resourceType;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'donation-platform',
          resource_type: detectedResourceType,
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

export const extractPublicIdFromUrl = (url: string): { publicId: string; resourceType: 'image' | 'video' } | null => {
  try {
    // Check for video URL pattern: /video/upload/
    let uploadMatch = url.match(/\/video\/upload\/(.+)$/);
    let resourceType: 'image' | 'video' = 'image';
    
    // If not video, check for image URL pattern: /image/upload/
    if (!uploadMatch) {
      uploadMatch = url.match(/\/image\/upload\/(.+)$/);
      if (!uploadMatch) return null;
    } else {
      resourceType = 'video';
    }
    
    let pathAfterUpload = uploadMatch[1];
    
    // Remove transformation parameters (e.g., w_500,h_300,c_fill/)
    pathAfterUpload = pathAfterUpload.replace(/^[^/]*(?:,[^/]*)*\//, '');
    // Remove version prefix (e.g., v1234567890/)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension
    const publicId = pathAfterUpload.replace(/\.[^/.]+$/, '');
    
    return publicId ? { publicId, resourceType } : null;
  } catch (error: any) {
    logger.error('Error extracting public ID from URL:', error);
    return null;
  }
};

export const deleteFromCloudinary = async (publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<void> => {
  try {
    if (config.cloudinary.cloudName) {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      logger.info(`Successfully deleted ${resourceType} from Cloudinary: ${publicId}`);
    }
  } catch (error: any) {
    logger.error(`Cloudinary delete error for public ID ${publicId} (${resourceType}):`, error);
  }
};

