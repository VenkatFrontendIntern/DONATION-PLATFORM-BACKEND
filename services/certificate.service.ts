import { IDonation } from '../models/Donation.model.js';
import { generateCertificate } from './pdf.service.js';
import { sendEmail } from '../utils/email.js';
import { generateCertificateEmailTemplate } from '../utils/certificateEmailTemplate.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload certificate to storage (currently returns local path)
 * In production, this should upload to cloud storage
 */
const uploadCertificate = async (buffer: Buffer, certificateNumber: string): Promise<string> => {
  return `certificates/${certificateNumber}.pdf`;
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

