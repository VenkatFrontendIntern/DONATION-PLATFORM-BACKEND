import { IDonation } from '../models/Donation.model.js';
import { generateCertificate } from './pdf.service.js';
import { sendEmail } from '../utils/email.js';
import { generateCertificateEmailTemplate } from '../utils/certificateEmailTemplate.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadBufferToCloudinary } from './cloudinary.service.js';

/**
 * Upload certificate buffer to Cloudinary and return the secure URL
 * This replaces the local file path approach which doesn't work on serverless platforms like Vercel
 */
const uploadCertificate = async (buffer: Buffer, certificateNumber: string): Promise<string> => {
  try {
    const certificateUrl = await uploadBufferToCloudinary(
      buffer,
      'donation-platform/certificates',
      certificateNumber
    );
    return certificateUrl;
  } catch (error: any) {
    logger.error('Failed to upload certificate to Cloudinary:', error);
    throw new Error('Failed to upload certificate to cloud storage');
  }
};

/**
 * Generate and send certificate for a donation
 */
export const generateAndSendCertificate = async (donation: IDonation): Promise<void> => {
  try {
    if (!donation.certificateNumber) {
      donation.certificateNumber = `80G-${uuidv4().substring(0, 8).toUpperCase()}`;
    }

    const certificateBuffer = await generateCertificate(donation);
    const certificateUrl = await uploadCertificate(certificateBuffer, donation.certificateNumber);
    
    donation.certificateUrl = certificateUrl;
    donation.certificateSent = true;
    await donation.save();

    const certificateEmailContent = generateCertificateEmailTemplate(
      donation.certificateNumber,
      donation.amount
    );

    await sendEmail({
      to: donation.donorEmail,
      subject: '🎉 Your 80G Tax Exemption Certificate - Engala Trust',
      html: certificateEmailContent,
    }).catch((emailError: any) => {
      logger.error('Email sending failed (non-critical):', emailError);
    });
  } catch (error: any) {
    logger.error('Certificate generation error (non-critical):', error);
    throw error;
  }
};

