import mongoose from 'mongoose';
import { Donation, IDonation } from '../models/Donation.model.js';
import { Campaign } from '../models/Campaign.model.js';
import { verifyPaymentSignature, verifyPaymentAmount } from '../utils/paymentVerification.js';
import { generateAndSendCertificate } from './certificate.service.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Process successful payment verification
 */
export const processSuccessfulPayment = async (
  donation: IDonation,
  razorpayPaymentId: string,
  razorpaySignature: string,
  session: mongoose.ClientSession
): Promise<void> => {
  const certificateNumber = `80G-${uuidv4().substring(0, 8).toUpperCase()}`;
  
  donation.status = 'success';
  donation.razorpayPaymentId = razorpayPaymentId;
  donation.razorpaySignature = razorpaySignature;
  donation.certificateNumber = certificateNumber;
  await donation.save({ session });

  const campaign = await Campaign.findById(donation.campaignId).session(session);
  if (campaign) {
    campaign.raisedAmount += donation.amount;
    campaign.donorCount += 1;
    await campaign.save({ session });
  }
};

/**
 * Verify payment and process donation
 */
export const verifyAndProcessPayment = async (
  donation: IDonation,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
  session: mongoose.ClientSession
): Promise<{ isValid: boolean; error?: string }> => {
  const isValidSignature = await verifyPaymentSignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  );

  if (!isValidSignature) {
    donation.status = 'failed';
    await donation.save({ session });
    return { isValid: false, error: 'Payment verification failed' };
  }

  const isValidAmount = await verifyPaymentAmount(
    razorpayOrderId,
    razorpayPaymentId,
    donation.amount
  );

  if (!isValidAmount) {
    logger.warn(`Amount mismatch for donation ${donation._id}. Expected: ${donation.amount}`);
    donation.status = 'failed';
    await donation.save({ session });
    return { isValid: false, error: 'Payment amount mismatch' };
  }

  await processSuccessfulPayment(donation, razorpayPaymentId, razorpaySignature, session);
  
  return { isValid: true };
};

/**
 * Handle post-payment success tasks (certificate generation, email)
 */
export const handlePostPaymentSuccess = async (donationId: string): Promise<void> => {
  try {
    const updatedDonation = await Donation.findById(donationId);
    if (!updatedDonation) {
      logger.error(`Donation ${donationId} not found after payment verification`);
      return;
    }

    await generateAndSendCertificate(updatedDonation);
  } catch (error: any) {
    logger.error('Post-payment success handling error (non-critical):', error);
  }
};

