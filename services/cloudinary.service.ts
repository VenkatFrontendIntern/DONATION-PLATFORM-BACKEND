import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Readable } from 'stream';

// Configure Cloudinary
if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

// Upload from buffer (memory storage) - no local file system needed
export const uploadToCloudinary = async (file: Express.Multer.File): Promise<string> => {
  try {
    if (!config.cloudinary.cloudName || !config.cloudinary.apiKey || !config.cloudinary.apiSecret) {
      logger.error('Cloudinary not configured! Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
      throw new Error('Cloudinary not configured');
    }

    if (!file.buffer) {
      throw new Error('File buffer is required. Make sure multer is using memory storage.');
    }

    // Upload buffer directly to Cloudinary using data URI format
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

      // Convert buffer to stream and pipe to Cloudinary
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

/**
 * Extract public ID from Cloudinary URL
 * @param url - Cloudinary URL
 * @returns Public ID without file extension, or null if URL is invalid
 */
export const extractPublicIdFromUrl = (url: string): string | null => {
  try {
    // Match Cloudinary URL patterns:
    // https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{version}/{public_id}.{format}
    // https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
    // https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{format}
    // https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
    
    // Extract everything after /image/upload/
    const uploadMatch = url.match(/\/image\/upload\/(.+)$/);
    if (!uploadMatch) return null;
    
    let pathAfterUpload = uploadMatch[1];
    
    // Remove transformations if present (e.g., w_500,h_500/ or c_fill,w_500/)
    // Transformations are segments that contain underscores or commas before a slash
    pathAfterUpload = pathAfterUpload.replace(/^[^/]*(?:,[^/]*)*\//, '');
    
    // Remove version if present (e.g., v123456/)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    
    // Remove file extension to get public ID
    // Public ID should not include the extension for deletion
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
    // Don't throw - allow campaign deletion to proceed even if Cloudinary deletion fails
  }
};

